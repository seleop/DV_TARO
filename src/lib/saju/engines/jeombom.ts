import { z } from "zod";
import { cnTenGodToKorean, parsePillar, samePillar, type TenGod } from "../ganji";
import type { EngineInput, EngineMetadata, NormalizedSaju, WallTime } from "../types";
import { getJsonWithRetry } from "./http";
import { EngineError, sameWallTime, validateNormalized, type EngineContext, type SajuEngine } from "./types";

/**
 * 점봄 만세력 API (https://jeombom.kr/manse-api) 어댑터.
 * - 인증 없음, 무료, 응답 라이선스 CC BY 4.0 (출처 표기 필요)
 * - tst=0으로 엔진 자체 보정을 끄고, 정규화된 UTC+9 벽시계를 넣는다.
 * - 대운은 응답에 없다. 자시 처리 방식은 문서에 없고, 2026-10 관찰 결과 23:30 입력에서
 *   일주=당일, 시주 천간=당일 기준(midnight)으로 응답했다. 문서화된 동작이 아니므로
 *   midnight 외 관법의 23시대는 비교 대상에서 뺀다.
 */

const PillarArr = z.tuple([z.string(), z.string()]);
const ElementsSchema = z.object({ 목: z.number(), 화: z.number(), 토: z.number(), 금: z.number(), 수: z.number() });
const TenGodPair = z.object({ stem: z.string(), branch: z.string() });

export const JeombomResponseSchema = z.object({
  ok: z.literal(true),
  input: z.object({
    year: z.number(),
    month: z.number(),
    day: z.number(),
    hour: z.number().nullable(),
    minute: z.number().nullable(),
    calendar: z.string(),
    trueSolarTime: z.boolean(),
  }),
  correction: z.object({ applied: z.boolean(), utcOffset: z.string().optional() }),
  pillars: z.object({ year: PillarArr, month: PillarArr, day: PillarArr, hour: PillarArr.nullable() }),
  elements: ElementsSchema.optional(),
  strength: z.string().optional(),
  yongsin: z.string().optional(),
  tenGods: z
    .object({ year: TenGodPair, month: TenGodPair, day: TenGodPair, hour: TenGodPair.nullable().optional() })
    .optional(),
  meta: z.object({ license: z.string().optional() }).passthrough().optional(),
});
export type JeombomResponse = z.infer<typeof JeombomResponseSchema>;

export interface JeombomRaw {
  term: JeombomResponse;
  pillar: JeombomResponse | null;
}

const ATTRIBUTION = "계산: 점봄 만세력 API (https://jeombom.kr)";

function baseUrl() {
  return process.env.JEOMBOM_BASE_URL || "https://jeombom.kr/api/manse";
}

async function callApi(params: Record<string, string>, ctx: EngineContext): Promise<JeombomResponse> {
  const url = `${baseUrl()}?${new URLSearchParams(params).toString()}`;
  const { status, body } = await getJsonWithRetry(url, ctx, "점봄 API");
  if (status === 400 || status === 422) throw new EngineError("INPUT_REJECTED", `점봄 API가 입력을 거부했습니다(${status}).`);
  if (status !== 200) throw new EngineError("HTTP_ERROR", `점봄 API 응답 코드 ${status}`);
  const parsed = JeombomResponseSchema.safeParse(body);
  if (!parsed.success) throw new EngineError("INVALID_RESPONSE", "점봄 API 응답 형식이 예상과 다릅니다.");
  if (parsed.data.correction.applied || parsed.data.input.trueSolarTime) {
    throw new EngineError("SETTINGS_MISMATCH", "점봄 API가 tst=0 요청에도 보정을 적용했습니다.");
  }
  return parsed.data;
}

function call(w: WallTime, input: EngineInput, ctx: EngineContext) {
  const params: Record<string, string> = {
    year: String(w.year),
    month: String(w.month),
    day: String(w.day),
    hour: String(w.hour),
    minute: String(w.minute),
    calendar: "solar",
    tst: "0",
  };
  if (input.gender) params.gender = input.gender;
  return callApi(params, ctx).then((r) => {
    if (r.input.year !== w.year || r.input.month !== w.month || r.input.day !== w.day || r.input.hour !== w.hour) {
      throw new EngineError("INVALID_RESPONSE", "점봄 API가 요청과 다른 입력을 반환했습니다.");
    }
    return r;
  });
}

/** 음력 날짜만으로 일주를 받아온다 (음력 변환 독립 검증용). */
export async function jeombomLunarDayPillar(
  lunar: { year: number; month: number; day: number; isLeapMonth: boolean },
  ctx: EngineContext,
): Promise<string> {
  const r = await callApi(
    {
      year: String(lunar.year),
      month: String(lunar.month),
      day: String(lunar.day),
      calendar: "lunar",
      leap: lunar.isLeapMonth ? "1" : "0",
      tst: "0",
    },
    ctx,
  );
  return r.pillars.day.join("");
}

const toPillar = (a: [string, string] | null | undefined) => (a ? parsePillar(a.join("")) : null);

export const jeombomEngine: SajuEngine<JeombomRaw> = {
  getEngineMetadata(): EngineMetadata {
    return {
      id: "jeombom",
      name: "점봄 만세력 API",
      version: "api-unversioned",
      kind: "remote-api",
      license: "CC BY 4.0",
      basis: "KASI 절기 데이터 기준(제공자 설명), tst=0으로 보정 끔, 입력을 UTC+9 벽시계로 전달",
      attribution: ATTRIBUTION,
      supportedDayBoundaries: ["midnight"],
      providesDaewoon: false,
    };
  },

  async calculate(input, ctx) {
    const term = await call(input.termTime, input, ctx);
    const pillar = sameWallTime(input.termTime, input.pillarTime) ? null : await call(input.pillarTime, input, ctx);
    return { term, pillar };
  },

  normalize(raw, input): NormalizedSaju {
    const dh = raw.pillar ?? raw.term;
    const late = input.timeKnown && input.pillarTime.hour === 23 && input.dayBoundary !== "midnight";
    const dayUnsupported = late && input.dayBoundary === "jasi";
    const year = toPillar(raw.term.pillars.year);
    const month = toPillar(raw.term.pillars.month);
    const day = dayUnsupported ? null : toPillar(dh.pillars.day);
    const hour = input.timeKnown && !late ? toPillar(dh.pillars.hour) : null;
    const consistent = samePillar(toPillar(dh.pillars.year), year) && samePillar(toPillar(dh.pillars.month), month);
    const tg = dh.tenGods;
    const k = (v: string | undefined) => cnTenGodToKorean(v) as TenGod;
    const stemTenGods =
      tg && consistent && !late ? { year: k(tg.year.stem), month: k(tg.month.stem), hour: hour && tg.hour ? k(tg.hour.stem) : null } : null;
    const unsupported = { comparable: false as const, reason: "SETTING_UNSUPPORTED" as const, note: `${input.dayBoundary} 관법 미지원` };
    // 보정으로 두 번 호출했다면 오행 개수는 연·월주와 일·시주 기준이 섞이므로 쓰지 않는다.
    const elements = raw.pillar || !input.timeKnown || late ? null : (raw.term.elements ?? null);
    return {
      engine: "jeombom",
      engineVersion: "api-unversioned",
      pillars: { year, month, day, hour },
      comparability: {
        year: { comparable: true },
        month: { comparable: true },
        day: dayUnsupported ? unsupported : { comparable: true },
        hour: !input.timeKnown ? { comparable: false, reason: "TIME_UNKNOWN" } : late ? unsupported : { comparable: true },
        daewoon: { comparable: false, reason: "NOT_PROVIDED", note: "API가 대운을 제공하지 않음" },
        tenGods: stemTenGods ? { comparable: true } : { comparable: false, reason: "NOT_PROVIDED" },
        elements: elements ? { comparable: true } : { comparable: false, reason: "NOT_PROVIDED" },
      },
      daewoon: null,
      stemTenGods,
      elements,
      interpretive: { strength: raw.term.strength, yongsin: raw.term.yongsin },
      applied: { dayBoundary: "midnight", timeBasis: "UTC+9 벽시계 (tst=0)", notes: [ATTRIBUTION] },
    };
  },

  validate: validateNormalized,
};
