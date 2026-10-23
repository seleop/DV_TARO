import { Solar } from "lunar-javascript";
import lunarPkg from "lunar-javascript/package.json";
import { cnTenGodToKorean, parsePillar, pillarToString, samePillar, type TenGod } from "../ganji";
import { addMinutes } from "../time";
import type { EngineInput, EngineMetadata, NormalizedSaju, WallTime } from "../types";
import { EngineError, validateNormalized, type SajuEngine } from "./types";

/**
 * 6tail/lunar-javascript 어댑터.
 *
 * 이 라이브러리의 절기 시각은 중국 표준시(UTC+8) 기준이다. 한국 기준(UTC+9)과 같은 절대 순간으로
 * 비교하려면 연주·월주·대운 계산 시 입력을 1시간 앞당겨(UTC+8 벽시계로) 넣어야 한다.
 * 일주·시주는 경도 기준 현지 시각 판정이므로 UTC+9 벽시계(또는 보정된 시각)를 그대로 넣는다.
 *
 * 자시 처리: sect=1 → 23시에 일주가 바뀜(= jasi), sect=2 → 일주는 그대로, 시주 천간은 다음날 기준(= splitJasi).
 * 'midnight' 관법(23시대 시주 천간을 당일 기준으로)은 지원하지 않으므로 23시대 시주는 비교 대상에서 뺀다.
 */

interface Snapshot {
  year: string;
  month: string;
  day: string;
  time: string;
  tenGods: { year: string; month: string; time: string };
}

export interface LunarJsRaw {
  term: Snapshot;
  pillar: Snapshot;
  yun: { forward: boolean; startYear: number; startMonth: number; startDay: number; daYun: string[] } | null;
}

const UTC8_SHIFT_MIN = -60;

function eightChar(w: WallTime, sect: 1 | 2) {
  const ec = Solar.fromYmdHms(w.year, w.month, w.day, w.hour, w.minute, 0).getLunar().getEightChar();
  ec.setSect(sect);
  return ec;
}

function snap(ec: ReturnType<typeof eightChar>): Snapshot {
  return {
    year: ec.getYear(),
    month: ec.getMonth(),
    day: ec.getDay(),
    time: ec.getTime(),
    tenGods: { year: ec.getYearShiShenGan(), month: ec.getMonthShiShenGan(), time: ec.getTimeShiShenGan() },
  };
}

const sectFor = (b: EngineInput["dayBoundary"]): 1 | 2 => (b === "jasi" ? 1 : 2);

export const lunarJavascriptEngine: SajuEngine<LunarJsRaw> = {
  getEngineMetadata(): EngineMetadata {
    return {
      id: "lunar-javascript",
      name: "6tail lunar-javascript (npm)",
      version: lunarPkg.version,
      kind: "local-library",
      license: "MIT",
      basis: "자체 천문 계산 절기(중국 표준시 UTC+8 기준) → 어댑터에서 UTC+8로 환산해 입력, 중국 음력",
      supportedDayBoundaries: ["jasi", "splitJasi"],
      providesDaewoon: true,
    };
  },

  async calculate(input) {
    try {
      const sect = sectFor(input.dayBoundary);
      const termEc = eightChar(addMinutes(input.termTime, UTC8_SHIFT_MIN), sect);
      const pillarEc = eightChar(input.pillarTime, sect);
      let yun: LunarJsRaw["yun"] = null;
      if (input.gender) {
        const y = termEc.getYun(input.gender === "male" ? 1 : 0);
        // daYun[0]은 첫 대운 이전 구간(간지 없음)이다.
        const list = y.getDaYun(10).slice(1).map((d) => d.getGanZhi());
        yun = { forward: y.isForward(), startYear: y.getStartYear(), startMonth: y.getStartMonth(), startDay: y.getStartDay(), daYun: list };
      }
      return { term: snap(termEc), pillar: snap(pillarEc), yun };
    } catch {
      throw new EngineError("ENGINE_EXCEPTION", "lunar-javascript 계산 중 예외가 발생했습니다.");
    }
  },

  normalize(raw, input): NormalizedSaju {
    const year = parsePillar(raw.term.year);
    const month = parsePillar(raw.term.month);
    const day = parsePillar(raw.pillar.day);
    const hourUnsupported = input.timeKnown && input.dayBoundary === "midnight" && input.pillarTime.hour === 23;
    const hour = input.timeKnown && !hourUnsupported ? parsePillar(raw.pillar.time) : null;
    const consistent = samePillar(parsePillar(raw.pillar.year), year) && samePillar(parsePillar(raw.pillar.month), month);
    const tg = (v: string) => cnTenGodToKorean(v) as TenGod;
    const stemTenGods = consistent
      ? { year: tg(raw.pillar.tenGods.year), month: tg(raw.pillar.tenGods.month), hour: hour ? tg(raw.pillar.tenGods.time) : null }
      : null;
    const notes: string[] = ["연주·월주·대운은 UTC+8 벽시계로 환산해 계산"];
    if (hourUnsupported) notes.push("midnight 관법의 23시대 시주는 이 엔진이 지원하지 않아 비교에서 제외");
    return {
      engine: "lunar-javascript",
      engineVersion: lunarPkg.version,
      pillars: { year, month, day, hour },
      comparability: {
        year: { comparable: true },
        month: { comparable: true },
        day: { comparable: true },
        hour: !input.timeKnown
          ? { comparable: false, reason: "TIME_UNKNOWN" }
          : hourUnsupported
            ? { comparable: false, reason: "SETTING_UNSUPPORTED", note: "midnight 관법 23시대 시주 미지원" }
            : { comparable: true },
        daewoon: raw.yun ? { comparable: true } : { comparable: false, reason: "NOT_PROVIDED", note: "성별 미입력" },
        tenGods: stemTenGods ? { comparable: true } : { comparable: false, reason: "NOT_PROVIDED" },
        elements: { comparable: false, reason: "NOT_PROVIDED", note: "어댑터에서 오행 개수를 사용하지 않음" },
      },
      daewoon: raw.yun
        ? {
            forward: raw.yun.forward,
            start: { years: raw.yun.startYear, months: raw.yun.startMonth, days: raw.yun.startDay },
            pillars: raw.yun.daYun
              .map((g) => pillarToString(parsePillar(g)))
              .filter((v): v is string => !!v)
              .slice(0, 8),
          }
        : null,
      stemTenGods,
      elements: null,
      interpretive: null,
      applied: {
        dayBoundary: input.dayBoundary === "midnight" ? "splitJasi" : input.dayBoundary,
        timeBasis: "연·월주: UTC+8 환산 / 일·시주: UTC+9 벽시계(보정 시 보정 시각)",
        notes,
      },
    };
  },

  validate: validateNormalized,
};
