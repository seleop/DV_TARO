import "server-only";
import { z } from "zod";

/**
 * 서버 환경변수. 클라이언트 번들로 들어가지 않도록 server-only로 고정한다.
 * NEXT_PUBLIC_ 접두사가 붙은 비밀값은 사용하지 않는다.
 */
const bool = (def: boolean) =>
  z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => (v === undefined ? def : v === "true" || v === "1"));

const num = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? def : Number(v)))
    .pipe(z.number().finite().nonnegative());

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  /** Supabase Postgres 연결 문자열 (Vercel에서는 transaction pooler 6543 포트 권장) */
  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  /** Supabase secret key(또는 legacy service_role key). 회원가입 시 계정 생성·삭제에만 사용 */
  SUPABASE_SECRET_KEY: z.string().optional(),
  /** 회원가입 방식: open(누구나 가입) / invite(초대 코드 필요) / closed(가입 중지) */
  SIGNUP_MODE: z.enum(["open", "invite", "closed"]).default("open"),
  /** 가입·로그인 시 관리자 권한을 줄 이메일 목록 (쉼표 구분) */
  ADMIN_EMAILS: z
    .string()
    .optional()
    .transform((v) => (v ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean)),
  DATA_ENCRYPTION_KEY: z
    .string({ error: "DATA_ENCRYPTION_KEY가 필요합니다. `npm run setup`으로 생성하세요." })
    .refine((v) => Buffer.from(v, "base64").length === 32, "DATA_ENCRYPTION_KEY는 base64 인코딩된 32바이트여야 합니다."),

  AI_PROVIDER: z.enum(["anthropic", "mock"]).default("mock"),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("claude-opus-5-5"),
  AI_EFFORT: z.enum(["low", "medium", "high"]).default("medium"),
  AI_TIMEOUT_MS: num(120_000),
  AI_MAX_RETRIES: num(2),

  /**
   * 흐름(HRUM, 플로트 주식회사) API. 키가 있으면 사주 원국 계산과 사주·오늘의 운세 풀이를 흐름으로 한다(2026-10-27 사용자 결정).
   * 흐름이 응답하지 못하면 원국은 앱 내장 엔진(manseryeok)으로 계산한다. 새 개인정보 고지에 동의한 사용자에게만 쓴다.
   */
  HRUM_API_KEY: z.string().optional(),
  HRUM_BASE_URL: z.string().url().default("https://api.hrum.ai/api/v1/partners/v1"),
  HRUM_TIMEOUT_MS: num(15_000),
  HRUM_READING_TIMEOUT_MS: num(60_000),
  /** 흐름 요금(원)을 사용량 기록·월 예산(달러)에 넣을 때 쓰는 환율 */
  HRUM_KRW_PER_USD: num(1400),

  /** 점봄 API: 예전 세 엔진 교차검증용. 흐름 단일 출처로 바꾼 뒤에는 쓰지 않는다 (예전 기록 화면의 출처 표기만 남음) */
  JEOMBOM_ENABLED: bool(true),
  JEOMBOM_BASE_URL: z.string().url().default("https://jeombom.kr/api/manse"),
  ENGINE_TIMEOUT_MS: num(8_000),
  ENGINE_MAX_RETRIES: num(1),

  LIMIT_AI_PER_USER_PER_DAY: num(20),
  LIMIT_AI_PER_USER_PER_MINUTE: num(3),
  LIMIT_CALC_PER_USER_PER_DAY: num(60),
  BUDGET_MONTHLY_USD: num(20),

  USAGE_LOG_RETENTION_DAYS: num(180),

  /** 로컬 체험 모드: Supabase 없이 내장 Postgres(PGlite)와 간이 로그인으로 실행. 프로덕션에서는 금지 */
  LOCAL_DEV_MODE: bool(false),
  LOCAL_DB_DIR: z.string().default("./.local-db"),
});

export type AppConfig = z.infer<typeof EnvSchema>;

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`환경변수 설정 오류: ${msg}`);
  }
  if (parsed.data.AI_PROVIDER === "anthropic" && !parsed.data.ANTHROPIC_API_KEY) {
    throw new Error("환경변수 설정 오류: AI_PROVIDER=anthropic 이면 ANTHROPIC_API_KEY가 필요합니다.");
  }
  if (parsed.data.LOCAL_DEV_MODE && process.env.NODE_ENV === "production" && !process.env.VITEST) {
    throw new Error("환경변수 설정 오류: LOCAL_DEV_MODE는 개발 환경에서만 쓸 수 있습니다.");
  }
  cached = parsed.data;
  return cached;
}

/** 필수 설정이 비어 있으면 명확한 메시지로 실패한다. */
export function requireConfig<K extends keyof AppConfig>(key: K): NonNullable<AppConfig[K]> {
  const v = getConfig()[key];
  if (v === undefined || v === null || v === "") throw new Error(`환경변수 ${String(key)}가 설정되지 않았습니다. .env.example을 참고하세요.`);
  return v as NonNullable<AppConfig[K]>;
}

/** 테스트에서 환경변수를 바꾼 뒤 다시 읽기 위해 사용한다. */
export function resetConfigForTests() {
  cached = null;
}
