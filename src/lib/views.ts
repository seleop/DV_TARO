import "server-only";
import type { StoredCalculation } from "./repo/records";

/** 본인에게만 보여주는 사주 계산 화면 데이터 (엔진별 값 비교 포함) */
export function sajuView(calc: StoredCalculation) {
  const c = calc.result;
  const i = calc.input;
  return {
    id: calc.id,
    label: calc.label,
    createdAt: calc.createdAt,
    input: {
      calendar: i.calendar,
      date: `${i.year}-${String(i.month).padStart(2, "0")}-${String(i.day).padStart(2, "0")}`,
      isLeapMonth: i.isLeapMonth,
      time: i.timeKnown ? `${String(i.hour).padStart(2, "0")}:${String(i.minute).padStart(2, "0")}` : null,
      gender: i.gender,
      birthplace: i.birthplaceLabel,
      settings: i.settings,
    },
    solarDate: c.solarDate,
    status: c.status,
    reasons: c.report.reasons,
    canonical: c.canonical,
    fields: c.report.fields,
    daewoon: c.report.daewoon,
    tenGods: c.report.tenGods,
    warnings: c.report.warnings,
    time: c.time,
    lunar: c.lunar,
    engines: c.engines.map((m) => {
      const r = c.report.engines.find((e) => e.engine === m.id);
      return { id: m.id, name: m.name, version: m.version, kind: m.kind, license: m.license, basis: m.basis, ok: r?.ok ?? false, errorCode: r?.errorCode ?? null, durationMs: r?.durationMs ?? 0 };
    }),
    resolutionLog: c.resolutionLog,
    attributions: c.attributions,
    rulesVersion: c.report.rulesVersion,
  };
}
export type SajuView = ReturnType<typeof sajuView>;
