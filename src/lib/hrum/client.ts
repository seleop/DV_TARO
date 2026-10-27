import "server-only";
import { getConfig } from "../config";

/**
 * 흐름(HRUM) 파트너 API 호출 (https://hrum.ai/docs.html).
 * - 인증: X-Partner-Api-Key 헤더. 응답은 { success, data } 또는 { success:false, statusCode, code?, message }
 * - 429·5xx(503 SERVICE_DEGRADED 포함)·네트워크 오류·시간 초과는 한 번 더 시도한다. 4xx는 다시 하지 않는다
 * - 오류 메시지·로그에 요청 본문(출생 정보·사주)과 키를 넣지 않는다
 */

export type HrumErrorCode = "DISABLED" | "AUTH" | "INSUFFICIENT_BALANCE" | "RATE_LIMITED" | "REJECTED" | "UNAVAILABLE" | "TIMEOUT" | "INVALID_RESPONSE";

export class HrumError extends Error {
  constructor(
    public readonly code: HrumErrorCode,
    message: string,
    public readonly status: number | null = null,
    /** 흐름이 준 오류 코드 (예: INVALID_LUNAR_DATE). 출생 정보는 들어 있지 않다 */
    public readonly hrumCode: string | null = null,
  ) {
    super(message);
    this.name = "HrumError";
  }
}

export interface HrumCallOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** 다시 시도 횟수 (기본 1) */
  retries?: number;
}

export function hrumConfigured() {
  return !!getConfig().HRUM_API_KEY;
}

type HrumEnvelope = { success?: boolean; data?: unknown; code?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function hrumPost<T = unknown>(path: string, body: unknown, opts: HrumCallOptions = {}): Promise<T> {
  const cfg = getConfig();
  if (!cfg.HRUM_API_KEY) throw new HrumError("DISABLED", "흐름 API 키가 설정되지 않았습니다.");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const retries = opts.retries ?? 1;
  let last: HrumError | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(last?.code === "RATE_LIMITED" ? 1000 : 400);
    let res: Response;
    try {
      res = await fetchImpl(`${cfg.HRUM_BASE_URL}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json", "X-Partner-Api-Key": cfg.HRUM_API_KEY },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(opts.timeoutMs ?? cfg.HRUM_TIMEOUT_MS),
      });
    } catch (e) {
      const name = (e as { name?: string })?.name;
      last = name === "TimeoutError" || name === "AbortError" ? new HrumError("TIMEOUT", "흐름 API 응답 시간 초과") : new HrumError("UNAVAILABLE", "흐름 API 연결 실패");
      continue;
    }
    let json: HrumEnvelope | null = null;
    try {
      json = (await res.json()) as HrumEnvelope;
    } catch {
      json = null;
    }
    if (res.ok && json?.success && json.data !== undefined) return json.data as T;
    const code = typeof json?.code === "string" ? json.code : null;
    if (res.status === 401 || res.status === 403) throw new HrumError("AUTH", "흐름 API 인증 실패", res.status, code);
    if (res.status === 402) throw new HrumError("INSUFFICIENT_BALANCE", "흐름 API 잔액 부족", res.status, code);
    if (res.status === 429) {
      last = new HrumError("RATE_LIMITED", "흐름 API 호출 제한", res.status, code);
      continue;
    }
    if (res.status >= 500) {
      last = new HrumError("UNAVAILABLE", `흐름 API 서버 오류(${res.status})`, res.status, code);
      continue;
    }
    if (res.ok) throw new HrumError("INVALID_RESPONSE", "흐름 API 응답 형식이 예상과 다릅니다.", res.status, code);
    throw new HrumError("REJECTED", `흐름 API가 요청을 거부했습니다(${res.status}${code ? ` ${code}` : ""}).`, res.status, code);
  }
  throw last ?? new HrumError("UNAVAILABLE", "흐름 API 알 수 없는 오류");
}

/** 운영 로그용: 오류 종류·상태 코드만 (출생 정보·키 없음) */
export function logHrumError(where: string, e: unknown) {
  if (e instanceof HrumError) console.warn(`[hrum ${where}] ${e.code} status=${e.status ?? "-"} code=${e.hrumCode ?? "-"}`);
  else console.warn(`[hrum ${where}] ${(e as Error)?.name ?? "unknown"}`);
}
