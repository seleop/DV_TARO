import { z } from "zod";
import { getConfig } from "../../config";
import { HrumError, hrumPost } from "../../hrum/client";
import { parsePillar, type TenGod } from "../ganji";
import type { EngineInput, EngineMetadata, NormalizedSaju, WallTime } from "../types";
import { EngineError, sameWallTime, validateNormalized, type EngineContext, type SajuEngine } from "./types";

/**
 * 흐름(HRUM) 만세력 API 어댑터 (POST /manseryeok, 호출당 ₩50 + 부가세).
 * 2026-10-27 사용자 결정으로 세 엔진 교차검증을 철회하고 흐름을 원국의 단일 출처로 쓴다.
 * - 시각: 앱이 정규화한 UTC+9 벽시계를 그대로 넣는다(흐름 자체 위치 보정은 쓰지 않음 — 좌표·국가를 보내지 않는다).
 *   그 날짜의 서울 시간이 UTC+9가 아니었던 시기(1954~61년, 서머타임)에는 고정 UTC+9 시간대(Etc/GMT-9)를 보낸다.
 * - 23시대 자시: jasi → traditional(자시부터 다음 날 일주), splitJasi → yajaSi(야자시). 앱 기본값 midnight(23시대 당일, 시주도 당일)는
 *   흐름에 같은 규칙이 없어 23시대 출생이면 SETTINGS_MISMATCH → 앱 내장 엔진으로 계산한다
 * - 시간 미상: 날짜만 보낸다(흐름이 년·월·일 3주로 계산). 같은 요청은 잠깐 기억해 두 번 과금하지 않는다
 * - 성별: 흐름 필수값. 미입력이면 "male"로 기둥만 받고 대운은 쓰지 않는다
 */

const PillarSchema = z.object({ stem: z.string(), branch: z.string(), stemSipsin: z.string().optional() }).passthrough();
export const HrumManseryeokSchema = z
  .object({
    wonkuk: z.object({ year: PillarSchema, month: PillarSchema, day: PillarSchema, hour: PillarSchema.nullable().optional() }).passthrough(),
    daeun: z.array(z.object({ stem: z.string(), branch: z.string(), startAge: z.number().optional() }).passthrough()).optional(),
    daeunNumber: z.number().optional(),
    daeunDirection: z.string().optional(),
    strength: z.object({ result: z.string().optional() }).passthrough().nullable().optional(),
    yongshin: z.string().nullable().optional(),
    warnings: z.array(z.object({ code: z.string() }).passthrough()).optional(),
  })
  .passthrough();
export type HrumManseryeok = z.infer<typeof HrumManseryeokSchema>;

export interface HrumRaw {
  term: HrumManseryeok;
  pillar: HrumManseryeok | null;
}

export const HRUM_ATTRIBUTION = "계산: 흐름(HRUM) 만세력 API (https://hrum.ai)";

/**
 * 한 번의 원국 계산 안에서 같은 요청(시간 미상일 때 하루의 시작·끝 두 번)은 한 번만 호출·과금되게 기억한다.
 * 계산마다 새로 만드는 ctx 객체에 묶어, 다른 요청·사용자와는 공유하지 않는다
 */
const perCalc = new WeakMap<EngineContext, Map<string, Promise<HrumManseryeok>>>();

/** 그 시각(UTC+9 벽시계)에 서울 시간대가 UTC+9였는지 */
export function seoulIsUtc9(w: WallTime) {
  const utc = new Date(Date.UTC(w.year, w.month - 1, w.day, w.hour - 9, w.minute));
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", timeZoneName: "shortOffset" }).formatToParts(utc).find((p) => p.type === "timeZoneName")?.value;
  return name === "GMT+9";
}

export function hrumRequest(w: WallTime, input: EngineInput) {
  const body: Record<string, unknown> = {
    year: w.year,
    month: w.month,
    day: w.day,
    timezone: seoulIsUtc9(w) ? "Asia/Seoul" : "Etc/GMT-9",
    gender: input.gender ?? "male",
    calendar: "solar",
  };
  if (input.timeKnown) {
    body.hour = w.hour;
    body.minute = w.minute;
    body.zaSiRule = input.dayBoundary === "splitJasi" ? "yajaSi" : "traditional";
  }
  return body;
}

async function call(w: WallTime, input: EngineInput, ctx: EngineContext): Promise<HrumManseryeok> {
  const body = input.timeKnown ? hrumRequest(w, input) : hrumRequest({ ...input.solarDate, hour: 12, minute: 0 }, input);
  const key = JSON.stringify(body);
  let memo = perCalc.get(ctx);
  if (!memo) perCalc.set(ctx, (memo = new Map()));
  const hit = memo.get(key);
  if (hit) return hit;
  const p = (async () => {
    let data: unknown;
    try {
      data = await hrumPost("/manseryeok", body, { fetchImpl: ctx.fetchImpl, timeoutMs: Math.max(ctx.timeoutMs, getConfig().HRUM_TIMEOUT_MS), retries: ctx.maxRetries });
    } catch (e) {
      if (e instanceof HrumError) {
        const map: Record<string, EngineError> = {
          TIMEOUT: new EngineError("TIMEOUT", "흐름 API 응답 시간 초과", true),
          RATE_LIMITED: new EngineError("RATE_LIMITED", "흐름 API 호출 제한", true),
          REJECTED: new EngineError("INPUT_REJECTED", e.message),
          INVALID_RESPONSE: new EngineError("INVALID_RESPONSE", e.message),
        };
        throw map[e.code] ?? new EngineError("HTTP_ERROR", e.message);
      }
      throw e;
    }
    const parsed = HrumManseryeokSchema.safeParse(data);
    if (!parsed.success) throw new EngineError("INVALID_RESPONSE", "흐름 API 응답 형식이 예상과 다릅니다.");
    if (parsed.data.warnings?.some((x) => x.code === "UNKNOWN_TIMEZONE")) {
      throw new EngineError("SETTINGS_MISMATCH", "흐름 API가 시간대를 인식하지 못했습니다.");
    }
    return parsed.data;
  })();
  memo.set(key, p);
  p.catch(() => memo.delete(key));
  return p;
}

const toPillar = (p: { stem: string; branch: string } | null | undefined) => (p ? parsePillar(`${p.stem}${p.branch}`) : null);

export const hrumEngine: SajuEngine<HrumRaw> = {
  getEngineMetadata(): EngineMetadata {
    return {
      id: "hrum",
      name: "흐름(HRUM) 만세력 API",
      version: "api-v1",
      kind: "remote-api",
      license: "상용 API (플로트 주식회사 이용약관)",
      basis: "흐름 규칙 기반 계산, 절기 기준. 앱이 정규화한 UTC+9 벽시계를 전달(흐름 자체 위치 보정 미사용)",
      attribution: HRUM_ATTRIBUTION,
      supportedDayBoundaries: ["jasi", "splitJasi"],
      providesDaewoon: true,
    };
  },

  async calculate(input, ctx) {
    if (input.timeKnown && input.dayBoundary === "midnight" && input.pillarTime.hour === 23) {
      throw new EngineError("SETTINGS_MISMATCH", "흐름 API에는 23시대를 당일로 보는 자시 규칙(midnight)이 없습니다.");
    }
    const term = await call(input.termTime, input, ctx);
    const pillar = input.timeKnown && !sameWallTime(input.termTime, input.pillarTime) ? await call(input.pillarTime, input, ctx) : null;
    return { term, pillar };
  },

  normalize(raw, input): NormalizedSaju {
    const dh = raw.pillar ?? raw.term;
    const year = toPillar(raw.term.wonkuk.year);
    const month = toPillar(raw.term.wonkuk.month);
    const day = toPillar(dh.wonkuk.day);
    const hour = input.timeKnown ? toPillar(dh.wonkuk.hour) : null;
    const w = dh.wonkuk;
    // 연·월주와 일·시주를 서로 다른 호출에서 받았으면 십신 기준(일간)이 섞이지 않게 같은 호출의 값만 쓴다
    const tgOk = !raw.pillar && w.year.stemSipsin && w.month.stemSipsin;
    const stemTenGods = tgOk ? { year: w.year.stemSipsin as TenGod, month: w.month.stemSipsin as TenGod, hour: hour && w.hour?.stemSipsin ? (w.hour.stemSipsin as TenGod) : null } : null;
    const dw = raw.term;
    const daewoonPillars = (dw.daeun ?? []).map((d) => `${d.stem}${d.branch}`);
    const hasDaewoon =
      !!input.gender && input.timeKnown && daewoonPillars.length >= 8 && !!dw.daeunDirection && dw.daeunNumber !== undefined && dw.daeunNumber >= 0 && dw.daeunNumber <= 12;
    const daewoon = hasDaewoon ? { forward: dw.daeunDirection === "순행", start: { years: dw.daeunNumber!, months: 0, days: 0 }, pillars: daewoonPillars } : null;
    return {
      engine: "hrum",
      engineVersion: "api-v1",
      pillars: { year, month, day, hour },
      comparability: {
        year: { comparable: true },
        month: { comparable: true },
        day: { comparable: true },
        hour: input.timeKnown ? { comparable: true } : { comparable: false, reason: "TIME_UNKNOWN" },
        daewoon: daewoon ? { comparable: true } : { comparable: false, reason: "NOT_PROVIDED" },
        tenGods: stemTenGods ? { comparable: true } : { comparable: false, reason: "NOT_PROVIDED" },
        // 오행 개수는 앱이 확정 원국에서 직접 센다 (흐름 집계 방식과 섞지 않음)
        elements: { comparable: false, reason: "NOT_PROVIDED" },
      },
      daewoon,
      stemTenGods,
      elements: null,
      interpretive: { strength: raw.term.strength?.result, yongsin: raw.term.yongshin ?? undefined },
      applied: { dayBoundary: input.dayBoundary, timeBasis: "UTC+9 벽시계 (흐름 위치 보정 미사용)", notes: [HRUM_ATTRIBUTION] },
    };
  },

  validate: validateNormalized,
};
