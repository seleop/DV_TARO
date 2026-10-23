import { z } from "zod";
import type { BirthInput } from "./types";

/** 출생지 경도 프리셋 (시청 소재지 기준, 소수 둘째 자리 반올림) */
export const BIRTHPLACES: Array<{ id: string; label: string; longitude: number }> = [
  { id: "seoul", label: "서울", longitude: 126.98 },
  { id: "incheon", label: "인천", longitude: 126.71 },
  { id: "suwon", label: "수원", longitude: 127.03 },
  { id: "chuncheon", label: "춘천", longitude: 127.73 },
  { id: "gangneung", label: "강릉", longitude: 128.88 },
  { id: "cheongju", label: "청주", longitude: 127.49 },
  { id: "daejeon", label: "대전", longitude: 127.38 },
  { id: "jeonju", label: "전주", longitude: 127.15 },
  { id: "gwangju", label: "광주", longitude: 126.85 },
  { id: "daegu", label: "대구", longitude: 128.6 },
  { id: "pohang", label: "포항", longitude: 129.34 },
  { id: "ulsan", label: "울산", longitude: 129.31 },
  { id: "busan", label: "부산", longitude: 129.08 },
  { id: "changwon", label: "창원", longitude: 128.68 },
  { id: "jeju", label: "제주", longitude: 126.53 },
];

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

const int = (min: number, max: number) => z.number().int().min(min).max(max);

export const BirthInputSchema = z
  .object({
    calendar: z.enum(["solar", "lunar"]),
    year: int(MIN_YEAR, MAX_YEAR),
    month: int(1, 12),
    day: int(1, 31),
    isLeapMonth: z.boolean().default(false),
    timeKnown: z.boolean(),
    hour: int(0, 23).nullable().default(null),
    minute: int(0, 59).nullable().default(null),
    gender: z.enum(["male", "female"]).nullable().default(null),
    birthplaceId: z.string().max(32).nullable().default(null),
    customLongitude: z.number().min(124).max(132).nullable().default(null),
    settings: z
      .object({
        correction: z.enum(["none", "lmt", "tst"]).default("none"),
        dayBoundary: z.enum(["midnight", "jasi", "splitJasi"]).default("midnight"),
        applyHistoricalOffset: z.boolean().default(true),
      })
      .strict()
      .default({ correction: "none", dayBoundary: "midnight", applyHistoricalOffset: true }),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.calendar === "solar") {
      if (v.isLeapMonth) ctx.addIssue({ code: "custom", path: ["isLeapMonth"], message: "윤달은 음력 입력에서만 선택할 수 있습니다." });
      const d = new Date(Date.UTC(v.year, v.month - 1, v.day));
      if (d.getUTCFullYear() !== v.year || d.getUTCMonth() !== v.month - 1 || d.getUTCDate() !== v.day) {
        ctx.addIssue({ code: "custom", path: ["day"], message: "존재하지 않는 양력 날짜입니다." });
      }
    } else if (v.day > 30) {
      ctx.addIssue({ code: "custom", path: ["day"], message: "음력 날짜는 30일을 넘을 수 없습니다." });
    }
    if (v.timeKnown) {
      if (v.hour === null) ctx.addIssue({ code: "custom", path: ["hour"], message: "출생 시를 입력하세요." });
      if (v.minute === null) ctx.addIssue({ code: "custom", path: ["minute"], message: "출생 분을 입력하세요." });
    } else if (v.hour !== null || v.minute !== null) {
      ctx.addIssue({ code: "custom", path: ["hour"], message: "시간 미상이면 시각을 비워 두세요." });
    }
    if (v.settings.correction !== "none") {
      if (!v.timeKnown) {
        ctx.addIssue({ code: "custom", path: ["settings", "correction"], message: "시간 보정은 출생 시각을 알 때만 쓸 수 있습니다." });
      }
      const preset = v.birthplaceId ? BIRTHPLACES.find((b) => b.id === v.birthplaceId) : null;
      if (v.birthplaceId && !preset) ctx.addIssue({ code: "custom", path: ["birthplaceId"], message: "알 수 없는 출생지입니다." });
      if (!preset && v.customLongitude === null) {
        ctx.addIssue({ code: "custom", path: ["birthplaceId"], message: "시간 보정을 하려면 출생지 또는 경도를 선택하세요." });
      }
    }
  });

export type BirthInputRequest = z.input<typeof BirthInputSchema>;

/** 요청 본문 → 내부 BirthInput. 실패 시 Zod 오류를 던진다. */
export function parseBirthInput(body: unknown): BirthInput {
  const v = BirthInputSchema.parse(body);
  const preset = v.birthplaceId ? BIRTHPLACES.find((b) => b.id === v.birthplaceId) ?? null : null;
  const useLongitude = v.settings.correction !== "none";
  return {
    calendar: v.calendar,
    year: v.year,
    month: v.month,
    day: v.day,
    isLeapMonth: v.calendar === "lunar" ? v.isLeapMonth : false,
    timeKnown: v.timeKnown,
    hour: v.timeKnown ? v.hour : null,
    minute: v.timeKnown ? v.minute : null,
    gender: v.gender,
    timeZone: "Asia/Seoul",
    longitude: useLongitude ? (preset?.longitude ?? v.customLongitude) : null,
    birthplaceLabel: useLongitude ? (preset?.label ?? `경도 ${v.customLongitude}`) : null,
    settings: v.settings,
  };
}
