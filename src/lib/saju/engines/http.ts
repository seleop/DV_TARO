import { EngineError, type EngineContext } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 타임아웃과 제한된 재시도를 적용한 GET JSON.
 * - 재시도 대상: 네트워크 오류, 타임아웃, 429, 5xx
 * - 재시도하지 않음: 4xx (입력 거부)
 * 오류 메시지에 URL 쿼리(출생 정보)를 넣지 않는다.
 */
export async function getJsonWithRetry(url: string, ctx: EngineContext, label: string): Promise<{ status: number; body: unknown }> {
  let lastErr: EngineError | null = null;
  for (let attempt = 0; attempt <= ctx.maxRetries; attempt++) {
    if (attempt > 0) await sleep(Math.min(250 * 2 ** (attempt - 1), 2000));
    const timeout = AbortSignal.timeout(ctx.timeoutMs);
    const signal = ctx.signal ? AbortSignal.any([ctx.signal, timeout]) : timeout;
    try {
      const res = await ctx.fetchImpl(url, { method: "GET", signal, headers: { accept: "application/json" } });
      if (res.status === 429) {
        lastErr = new EngineError("RATE_LIMITED", `${label} 호출 제한(429)`, true);
        continue;
      }
      if (res.status >= 500) {
        lastErr = new EngineError("HTTP_ERROR", `${label} 서버 오류(${res.status})`, true);
        continue;
      }
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        throw new EngineError("INVALID_RESPONSE", `${label} 응답이 JSON이 아닙니다.`);
      }
      return { status: res.status, body };
    } catch (e) {
      if (e instanceof EngineError) throw e;
      const name = (e as { name?: string })?.name;
      if (name === "TimeoutError" || (name === "AbortError" && timeout.aborted)) {
        lastErr = new EngineError("TIMEOUT", `${label} 응답 시간 초과(${ctx.timeoutMs}ms)`, true);
      } else if (name === "AbortError") {
        throw new EngineError("NETWORK_ERROR", `${label} 요청이 취소되었습니다.`);
      } else {
        lastErr = new EngineError("NETWORK_ERROR", `${label} 네트워크 오류`, true);
      }
    }
  }
  throw lastErr ?? new EngineError("NETWORK_ERROR", `${label} 알 수 없는 오류`);
}
