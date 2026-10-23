import "server-only";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { AiError } from "./ai/provider";
import { getCurrentUser } from "./auth/session";
import { LimitError } from "./limits";
import { AuthError, type User } from "./repo/users";
import { SajuInputError } from "./saju/service";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type Auth = "none" | "user" | "admin";

interface Ctx<A extends Auth> {
  req: Request;
  user: A extends "none" ? User | null : User;
  body: unknown;
  params: Record<string, string>;
}

const DEFAULT_MAX_BODY = 16 * 1024;

/** 같은 출처 요청인지 확인 (CSRF 완화). SameSite=Lax 쿠키와 함께 쓴다. */
function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) {
    // 일부 브라우저는 동일 출처 GET에 Origin을 붙이지 않는다. 변경 요청은 Origin을 요구한다.
    throw new HttpError(403, "FORBIDDEN_ORIGIN", "허용되지 않은 요청입니다.");
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "FORBIDDEN_ORIGIN", "허용되지 않은 요청입니다.");
  }
  if (!host || originHost !== host) throw new HttpError(403, "FORBIDDEN_ORIGIN", "허용되지 않은 요청입니다.");
}

async function readJson(req: Request, maxBytes: number): Promise<unknown> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > maxBytes) throw new HttpError(413, "PAYLOAD_TOO_LARGE", "요청 본문이 너무 큽니다.");
  const text = await req.text();
  if (Buffer.byteLength(text) > maxBytes) throw new HttpError(413, "PAYLOAD_TOO_LARGE", "요청 본문이 너무 큽니다.");
  if (!text) return {};
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "JSON 요청만 허용됩니다.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "INVALID_JSON", "JSON 형식이 올바르지 않습니다.");
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

/** 오류 응답: 키·출생 정보 등 민감 정보는 포함하지 않는다. */
function toErrorResponse(e: unknown): Response {
  if (e instanceof HttpError) return json({ error: { code: e.code, message: e.message } }, e.status);
  if (e instanceof ZodError) {
    return json(
      { error: { code: "VALIDATION_ERROR", message: "입력값을 확인해 주세요.", issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } },
      400,
    );
  }
  if (e instanceof SajuInputError) return json({ error: { code: "INVALID_BIRTH_INPUT", message: e.message } }, 400);
  if (e instanceof AuthError) {
    const status = e.code === "INVALID_CREDENTIALS" || e.code === "DISABLED" ? 401 : e.code === "EMAIL_TAKEN" ? 409 : e.code === "SIGNUP_CLOSED" ? 403 : e.code === "AUTH_FAILED" ? 502 : 400;
    return json({ error: { code: e.code, message: e.message } }, status);
  }
  if (e instanceof LimitError) return json({ error: { code: e.code, message: e.message } }, 429);
  if (e instanceof AiError) {
    const status = e.code === "AI_RATE_LIMITED" ? 503 : e.code === "AI_TIMEOUT" ? 504 : 502;
    return json({ error: { code: e.code, message: e.message } }, status);
  }
  const ref = randomUUID().slice(0, 8);
  // 스택에는 사용자 입력이 섞일 수 있어 이름과 메시지 첫 줄만 남긴다.
  const err = e as { name?: string; message?: string };
  console.error(`[api-error ${ref}] ${err?.name ?? "Error"}: ${String(err?.message ?? "").split("\n")[0].slice(0, 200)}`);
  return json({ error: { code: "INTERNAL_ERROR", message: `서버 오류가 발생했습니다. (참조 ${ref})` } }, 500);
}

export function handler<A extends Auth>(
  opts: { auth: A; maxBodyBytes?: number },
  fn: (ctx: Ctx<A>) => Promise<Response>,
) {
  return async (req: Request, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
      const user = await getCurrentUser();
      if (opts.auth !== "none" && !user) throw new HttpError(401, "UNAUTHENTICATED", "로그인이 필요합니다.");
      if (opts.auth === "admin" && user?.role !== "admin") throw new HttpError(403, "FORBIDDEN", "관리자만 접근할 수 있습니다.");
      const body = req.method === "GET" || req.method === "HEAD" || req.method === "DELETE" ? {} : await readJson(req, opts.maxBodyBytes ?? DEFAULT_MAX_BODY);
      const params = (await context?.params) ?? {};
      return await fn({ req, user: user as Ctx<A>["user"], body, params });
    } catch (e) {
      return toErrorResponse(e);
    }
  };
}

// ── 로그인 시도 제한 (인스턴스 메모리 기준의 보조 장치. 주 방어는 Supabase Auth의 자체 rate limit) ──
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW = 15 * 60_000;
const MAX = 8;

export function checkLoginAttempts(key: string) {
  const a = attempts.get(key);
  if (a && Date.now() - a.first < WINDOW && a.count >= MAX) {
    throw new HttpError(429, "TOO_MANY_ATTEMPTS", "로그인 시도가 너무 많습니다. 15분 뒤에 다시 시도해 주세요.");
  }
}
export function recordLoginFailure(key: string) {
  const a = attempts.get(key);
  if (!a || Date.now() - a.first >= WINDOW) attempts.set(key, { count: 1, first: Date.now() });
  else a.count += 1;
}
export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
}
