import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { getConfig } from "../config";

export type AiErrorCode =
  | "AI_TIMEOUT"
  | "AI_RATE_LIMITED"
  | "AI_UPSTREAM_ERROR"
  | "AI_REFUSED"
  | "AI_TRUNCATED"
  | "AI_SCHEMA_INVALID"
  | "AI_UNGROUNDED"
  | "AI_CONFIG";

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    public readonly usage: { inputTokens: number; outputTokens: number } = { inputTokens: 0, outputTokens: 0 },
  ) {
    super(message);
    this.name = "AiError";
  }
}

export interface GenerateRequest<T> {
  system: string;
  user: string;
  /** 모델에 전달하는 출력 구조 */
  apiSchema: z.ZodType;
  maxTokens: number;
  /** 모의 공급자일 때 쓸 결정적 응답 생성기 */
  mock: () => T;
}

export interface GenerateResult {
  data: unknown;
  provider: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface AiProvider {
  name: "anthropic" | "mock";
  model: string;
  generate<T>(req: GenerateRequest<T>): Promise<GenerateResult>;
}

class AnthropicProvider implements AiProvider {
  name = "anthropic" as const;
  private client: Anthropic;
  constructor(
    apiKey: string,
    public model: string,
    private effort: "low" | "medium" | "high",
    timeoutMs: number,
    maxRetries: number,
  ) {
    // SDK가 408/409/429/5xx·연결 오류를 maxRetries만큼 재시도한다. timeout 단위는 ms.
    this.client = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries });
  }

  async generate<T>(req: GenerateRequest<T>): Promise<GenerateResult> {
    try {
      const res = await this.client.messages.parse({
        model: this.model,
        max_tokens: req.maxTokens,
        system: req.system,
        messages: [{ role: "user", content: req.user }],
        output_config: { effort: this.effort, format: zodOutputFormat(req.apiSchema) },
      });
      const usage = { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
      if (res.stop_reason === "refusal") throw new AiError("AI_REFUSED", "AI가 이 요청에 대한 해석을 거절했습니다.", usage);
      if (res.stop_reason === "max_tokens") throw new AiError("AI_TRUNCATED", "AI 응답이 길이 제한으로 잘렸습니다.", usage);
      if (res.parsed_output == null) throw new AiError("AI_SCHEMA_INVALID", "AI 응답을 구조화된 형식으로 해석하지 못했습니다.", usage);
      return { data: res.parsed_output, provider: this.name, model: this.model, usage };
    } catch (e) {
      if (e instanceof AiError) throw e;
      if (e instanceof Anthropic.APIConnectionTimeoutError) throw new AiError("AI_TIMEOUT", "AI 응답 시간이 초과되었습니다.");
      if (e instanceof Anthropic.RateLimitError) throw new AiError("AI_RATE_LIMITED", "AI 서비스 호출 한도에 걸렸습니다. 잠시 후 다시 시도해 주세요.");
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
        throw new AiError("AI_CONFIG", "AI 서비스 인증 설정에 문제가 있습니다. 관리자에게 문의하세요.");
      }
      if (e instanceof Anthropic.APIError || e instanceof Anthropic.APIConnectionError) {
        throw new AiError("AI_UPSTREAM_ERROR", "AI 서비스 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
      // zod 파싱 오류 등
      throw new AiError("AI_SCHEMA_INVALID", "AI 응답 형식이 올바르지 않습니다.");
    }
  }
}

/** API 키 없이 동작하는 모의 공급자. 화면에 "모의 응답"으로 표시된다. */
export class MockProvider implements AiProvider {
  name = "mock" as const;
  model = "mock";
  constructor(private override?: (req: GenerateRequest<unknown>) => unknown) {}
  async generate<T>(req: GenerateRequest<T>): Promise<GenerateResult> {
    const data = this.override ? this.override(req as GenerateRequest<unknown>) : req.mock();
    const chars = req.system.length + req.user.length;
    return {
      data,
      provider: this.name,
      model: this.model,
      usage: { inputTokens: Math.ceil(chars / 1.5), outputTokens: Math.ceil(JSON.stringify(data ?? "").length / 1.5) },
    };
  }
}

let provider: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (provider) return provider;
  const cfg = getConfig();
  provider =
    cfg.AI_PROVIDER === "anthropic"
      ? new AnthropicProvider(cfg.ANTHROPIC_API_KEY!, cfg.AI_MODEL, cfg.AI_EFFORT, cfg.AI_TIMEOUT_MS, cfg.AI_MAX_RETRIES)
      : new MockProvider();
  return provider;
}

export function setAiProviderForTests(p: AiProvider | null) {
  provider = p;
}
