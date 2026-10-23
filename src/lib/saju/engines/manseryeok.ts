import { calculateFourPillars } from "manseryeok";
import mansPkg from "manseryeok/package.json";
import { cnTenGodToKorean, parsePillar, samePillar, type TenGod } from "../ganji";
import type { EngineInput, EngineMetadata, NormalizedSaju, WallTime } from "../types";
import { EngineError, sameWallTime, validateNormalized, type SajuEngine } from "./types";

interface Snapshot {
  pillars: { year: string; month: string; day: string; hour: string };
  stemTenGods: { year: string; month: string; hour: string };
  luck: { forward: boolean; startYears: number; startMonths: number; startDays: number; pillars: string[] } | null;
}

export interface ManseryeokRaw {
  term: Snapshot;
  pillar: Snapshot | null;
}

function run(w: WallTime, input: EngineInput): Snapshot {
  try {
    const r = calculateFourPillars({
      year: w.year,
      month: w.month,
      day: w.day,
      hour: w.hour,
      minute: w.minute,
      // 보정은 정규화 단계에서 이미 끝났으므로 엔진 자체 보정은 끈다 (trueSolarTime 미지정 = 입력을 KST로 간주).
      dayBoundary: input.dayBoundary,
      ...(input.gender ? { gender: input.gender } : {}),
    });
    const o = r.toObject();
    return {
      pillars: { year: o.year, month: o.month, day: o.day, hour: o.hour },
      stemTenGods: {
        year: String(r.tenGods.year.stem),
        month: String(r.tenGods.month.stem),
        hour: String(r.tenGods.hour.stem),
      },
      luck: r.luckPillars
        ? {
            forward: r.luckPillars.forward,
            startYears: r.luckPillars.startYears,
            startMonths: r.luckPillars.startMonths,
            startDays: r.luckPillars.startDays,
            pillars: r.luckPillars.pillars.map((p) => p.korean),
          }
        : null,
    };
  } catch (e) {
    if (e instanceof RangeError) throw new EngineError("INPUT_REJECTED", "manseryeok이 입력 범위를 거부했습니다.");
    throw new EngineError("ENGINE_EXCEPTION", "manseryeok 계산 중 예외가 발생했습니다.");
  }
}

export const manseryeokEngine: SajuEngine<ManseryeokRaw> = {
  getEngineMetadata(): EngineMetadata {
    return {
      id: "manseryeok",
      name: "manseryeok (npm)",
      version: mansPkg.version,
      kind: "local-library",
      license: "MIT",
      basis: "KASI 정본 음력·절입표(분 단위), 연주=입춘 절입 순간, 월주=절(節) 경계, 입력은 UTC+9 표준시로 간주",
      supportedDayBoundaries: ["midnight", "jasi", "splitJasi"],
      providesDaewoon: true,
    };
  },

  async calculate(input) {
    const term = run(input.termTime, input);
    const pillar = sameWallTime(input.termTime, input.pillarTime) ? null : run(input.pillarTime, input);
    return { term, pillar };
  },

  normalize(raw, input): NormalizedSaju {
    const dh = raw.pillar ?? raw.term;
    const pillars = {
      year: parsePillar(raw.term.pillars.year),
      month: parsePillar(raw.term.pillars.month),
      day: parsePillar(dh.pillars.day),
      hour: input.timeKnown ? parsePillar(dh.pillars.hour) : null,
    };
    // 보정으로 두 번 계산했을 때 연·월주가 다르면 십신 기준이 섞이므로 십신을 비교하지 않는다.
    const consistent =
      !raw.pillar ||
      (samePillar(parsePillar(raw.pillar.pillars.year), pillars.year) &&
        samePillar(parsePillar(raw.pillar.pillars.month), pillars.month));
    const tg = (v: string) => cnTenGodToKorean(v) as TenGod;
    const stemTenGods = consistent
      ? { year: tg(dh.stemTenGods.year), month: tg(dh.stemTenGods.month), hour: input.timeKnown ? tg(dh.stemTenGods.hour) : null }
      : null;
    const luck = input.gender ? raw.term.luck : null;
    return {
      engine: "manseryeok",
      engineVersion: mansPkg.version,
      pillars,
      comparability: {
        year: { comparable: true },
        month: { comparable: true },
        day: { comparable: true },
        hour: input.timeKnown ? { comparable: true } : { comparable: false, reason: "TIME_UNKNOWN" },
        daewoon: luck ? { comparable: true } : { comparable: false, reason: "NOT_PROVIDED", note: "성별 미입력" },
        tenGods: stemTenGods ? { comparable: true } : { comparable: false, reason: "NOT_PROVIDED" },
        elements: { comparable: false, reason: "NOT_PROVIDED", note: "엔진이 오행 개수를 제공하지 않음" },
      },
      daewoon: luck
        ? {
            forward: luck.forward,
            start: { years: luck.startYears, months: luck.startMonths, days: luck.startDays },
            pillars: luck.pillars.slice(0, 8),
          }
        : null,
      stemTenGods,
      elements: null,
      interpretive: null,
      applied: { dayBoundary: input.dayBoundary, timeBasis: "UTC+9 벽시계 (엔진 자체 보정 끔)", notes: [] },
    };
  },

  validate: validateNormalized,
};
