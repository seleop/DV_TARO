"use client";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public issues: Array<{ path: string; message: string }> = [],
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "content-type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string; issues?: Array<{ path: string; message: string }> } }).error;
    throw new ApiError(res.status, e?.code ?? "ERROR", e?.message ?? "요청을 처리하지 못했습니다.", e?.issues ?? []);
  }
  return data as T;
}

export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.issues.length) return `${e.message} ${e.issues.map((i) => i.message).join(" / ")}`;
    return e.message;
  }
  return "요청을 처리하지 못했습니다. 네트워크 상태를 확인해 주세요.";
}

export function formatDate(ms: number) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
}
