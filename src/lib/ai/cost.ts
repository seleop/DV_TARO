/**
 * 모델 단가 (USD / 100만 토큰). 출처: Anthropic 공식 가격표 (2026-10 기준, 표준 요청·캐시 미적용).
 * 실제 청구액은 프롬프트 캐시, 사고(thinking) 토큰, 환율 등에 따라 달라지므로 화면에는 "추정치"로만 표시한다.
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  // 안전 분류기 거절 시 서버가 대신 실행할 수 있는 모델 (fallbacks: "default")
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-fable-5-1": { input: 10, output: 50 },
  mock: { input: 0, output: 0 },
};

/** 단가를 모르는 모델은 예산 판단에서 보수적으로 가장 비싼 단가를 쓴다. */
const FALLBACK = { input: 10, output: 50 };

export function priceFor(model: string) {
  return MODEL_PRICING[model] ?? null;
}

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): { usd: number; known: boolean } {
  const p = priceFor(model);
  const rate = p ?? FALLBACK;
  return { usd: (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000, known: !!p };
}

/** 호출 전 최악의 비용 (입력은 글자 수 기반 근사, 출력은 max_tokens 상한) */
export function worstCaseCostUsd(model: string, promptChars: number, maxTokens: number): number {
  const approxInput = Math.ceil(promptChars / 1.5) + 200;
  return estimateCostUsd(model, approxInput, maxTokens).usd;
}
