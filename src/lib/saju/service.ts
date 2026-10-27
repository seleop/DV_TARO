import "server-only";
import { getConfig } from "../config";
import { hmac } from "../crypto";
import { countElements, parsePillar, pillarToHanja, STEM_ELEMENT, zodiacAnimal, type Element, type Pillar } from "./ganji";
import { hrumEngine } from "./engines/hrum";
import { lunarJavascriptEngine } from "./engines/lunar-javascript";
import { manseryeokEngine } from "./engines/manseryeok";
import { EngineError, type EngineContext, type SajuEngine } from "./engines/types";
import { kasiLunarConversion, verifyLunarConversion, type LunarConversionResult } from "./lunar";
import { normalizeBirthTime, type TimeNormalization } from "./time";
import type { BirthInput, CoreField, EngineInput, EngineMetadata, WallTime } from "./types";
import { crossValidate, VERIFY_RULES_VERSION, type EngineOutcome, type VerificationReport } from "./verify";

export class SajuInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SajuInputError";
  }
}

/** AI와 화면에 전달하는 확정 결과. 검증되지 않은 필드는 null로 둔다. */
export interface SajuCanonical {
  pillars: Record<CoreField, { ganji: string; hanja: string } | null>;
  dayMaster: { stem: string; element: Element } | null;
  zodiacAnimal: string | null;
  /** 확정된 기둥만으로 센 단순 오행 개수 */
  elements: Record<Element, number> | null;
  elementsBasis: string;
  stemTenGods: { year: string; month: string; hour: string | null } | null;
  daewoon: {
    forward: boolean;
    pillars: string[];
    startText: string;
    verified: "MATCH" | "CONDITIONAL";
  } | null;
  /** 해석 체계에 따라 달라지는 참고값 (검증 대상 아님) */
  interpretiveReference: Array<{ engine: string; strength?: string; yongsin?: string }>;
  unresolvedFields: string[];
}

export interface SajuComputation {
  cacheKey: string;
  status: VerificationReport["status"];
  canonical: SajuCanonical;
  report: VerificationReport;
  time: TimeNormalization | null;
  lunar: LunarConversionResult | null;
  solarDate: { year: number; month: number; day: number };
  engines: EngineMetadata[];
  outcomes: EngineOutcome[];
  resolutionLog: string[];
  attributions: string[];
}

export interface SajuDeps {
  engines?: SajuEngine[];
  ctx?: Partial<EngineContext>;
  jeombomEnabled?: boolean;
  /** 흐름 API를 쓸지 (키가 있고, 사용자가 흐름 전송을 포함한 개인정보 고지에 동의했을 때만 true) */
  useHrum?: boolean;
  /** 값을 확정하는 데 필요한 엔진 수. 기본: 엔진이 하나면 1(단일 출처), 둘 이상이면 2(교차검증) */
  minEngines?: number;
}

/**
 * 원국 계산 엔진 (2026-10-27 사용자 결정: 세 엔진 교차검증 철회, 흐름 단일 출처).
 * 흐름을 쓸 수 있으면 흐름 하나, 아니면 앱 내장 manseryeok 하나. 흐름이 실패하면 calculateSaju 가 내장 엔진으로 다시 계산한다.
 */
export function defaultEngines(useHrum = false): SajuEngine[] {
  return useHrum && getConfig().HRUM_API_KEY ? [hrumEngine as SajuEngine] : [manseryeokEngine as SajuEngine];
}

/**
 * 캐시 키: 정규화된 입력 + 엔진 버전 + 규칙 버전 + 시간 보정 설정.
 * 설정이나 엔진 버전이 바뀌면 키가 달라져 캐시가 분리된다. 사용자 ID를 넣어 사용자 간 캐시를 공유하지 않는다.
 * 캐시는 DB(saju_calculations.cache_key)에만 둔다. 서버리스 인스턴스 사이에 공유되고, 기록을 지우면 캐시도 함께 사라진다.
 */
export function computeCacheKey(userId: string, input: BirthInput, engines: EngineMetadata[]): string {
  const material = JSON.stringify({
    u: userId,
    i: [input.calendar, input.year, input.month, input.day, input.isLeapMonth, input.timeKnown, input.hour, input.minute, input.gender, input.longitude],
    s: [input.settings.correction, input.settings.dayBoundary, input.settings.applyHistoricalOffset],
    e: engines.map((e) => `${e.id}@${e.version}`).sort(),
    r: VERIFY_RULES_VERSION,
  });
  return hmac(`calc:${material}`);
}

async function runEngine(engine: SajuEngine, input: EngineInput, ctx: EngineContext) {
  const meta = engine.getEngineMetadata();
  const started = performance.now();
  try {
    const raw = await engine.calculate(input, ctx);
    const result = engine.normalize(raw, input);
    const v = engine.validate(result, input);
    return {
      engine: meta.id,
      engineVersion: meta.version,
      ok: true,
      result,
      validationErrors: v.errors,
      durationMs: Math.round(performance.now() - started),
    } satisfies EngineOutcome;
  } catch (e) {
    const code = e instanceof EngineError ? e.code : "ENGINE_EXCEPTION";
    return { engine: meta.id, engineVersion: meta.version, ok: false, errorCode: code, durationMs: Math.round(performance.now() - started) } satisfies EngineOutcome;
  }
}

function buildCanonical(report: VerificationReport): SajuCanonical {
  const pick = (f: CoreField) => {
    const v = report.fields[f];
    if ((v.status === "MATCH" || v.status === "CONDITIONAL") && v.agreedValue) return parsePillar(v.agreedValue);
    return null;
  };
  const p: Record<CoreField, Pillar | null> = { year: pick("year"), month: pick("month"), day: pick("day"), hour: pick("hour") };
  const unresolved = (Object.keys(report.fields) as CoreField[]).filter(
    (f) => report.fields[f].status !== "NOT_APPLICABLE" && !p[f],
  );
  const dw = report.daewoon;
  let daewoon: SajuCanonical["daewoon"] = null;
  if ((dw.status === "MATCH" || dw.status === "CONDITIONAL") && dw.pillars && dw.forward !== null) {
    let startText = "시작 시점 미확정";
    if (dw.start) startText = `약 ${dw.start.years}세 ${dw.start.months}개월`;
    else if (dw.startRange) {
      const f = (m: number) => `${Math.floor(m / 12)}세 ${m % 12}개월`;
      startText = `${f(dw.startRange.minMonths)} ~ ${f(dw.startRange.maxMonths)} (엔진별 계산 방식 차이)`;
    }
    daewoon = { forward: dw.forward, pillars: dw.pillars, startText, verified: dw.status };
  }
  const all = [p.year, p.month, p.day, p.hour];
  return {
    pillars: Object.fromEntries(
      (Object.keys(p) as CoreField[]).map((f) => [f, p[f] ? { ganji: `${p[f]!.stem}${p[f]!.branch}`, hanja: pillarToHanja(p[f]!) } : null]),
    ) as SajuCanonical["pillars"],
    dayMaster: p.day ? { stem: p.day.stem, element: STEM_ELEMENT[p.day.stem] } : null,
    zodiacAnimal: p.year ? zodiacAnimal(p.year.branch) : null,
    elements: all.some(Boolean) ? countElements(all) : null,
    elementsBasis: `확정된 기둥 ${all.filter(Boolean).length}개의 천간·지지 단순 개수 (지장간·계절 가중치 미반영)`,
    stemTenGods: report.tenGods.status === "MATCH" ? report.tenGods.agreed : null,
    daewoon,
    interpretiveReference: report.interpretiveDifferences,
    unresolvedFields: unresolved,
  };
}

const at = (d: { year: number; month: number; day: number }, hour: number, minute: number): WallTime => ({ ...d, hour, minute });

export async function calculateSaju(userId: string, input: BirthInput, deps: SajuDeps = {}): Promise<SajuComputation> {
  const cfg = getConfig();
  let engines = deps.engines ?? defaultEngines(deps.useHrum);
  let metas = engines.map((e) => e.getEngineMetadata());
  let cacheKey = computeCacheKey(userId, input, metas);
  const minEngines = deps.minEngines ?? (engines.length >= 2 ? 2 : 1);

  const ctx: EngineContext = {
    fetchImpl: deps.ctx?.fetchImpl ?? fetch,
    timeoutMs: deps.ctx?.timeoutMs ?? cfg.ENGINE_TIMEOUT_MS,
    maxRetries: deps.ctx?.maxRetries ?? cfg.ENGINE_MAX_RETRIES,
    signal: deps.ctx?.signal,
  };
  const jeombomEnabled = deps.jeombomEnabled ?? cfg.JEOMBOM_ENABLED;
  const resolutionLog: string[] = [];

  // 1) 음력 변환 검증
  let lunar: LunarConversionResult | null = null;
  let solarDate = { year: input.year, month: input.month, day: input.day };
  if (input.calendar === "lunar") {
    const l = { year: input.year, month: input.month, day: input.day, isLeapMonth: input.isLeapMonth };
    // 단일 출처면 KASI 정본으로만 변환, 교차검증이면 예전처럼 독립 출처까지 확인
    lunar = minEngines === 1 ? kasiLunarConversion(l) : await verifyLunarConversion(l, { jeombomEnabled, ctx });
    if (lunar.status === "INVALID_DATE" || !lunar.solar) throw new SajuInputError(lunar.notes[0] ?? "존재하지 않는 음력 날짜입니다.");
    solarDate = lunar.solar;
    resolutionLog.push(`음력 변환: ${lunar.status} (KASI ${lunar.candidates.kasi ?? "없음"}, 중국 ${lunar.candidates.chinese ?? "없음"})`);
  }

  // 2) 시각 정규화 및 엔진 입력 생성
  let time: TimeNormalization | null = null;
  const base = {
    solarDate,
    timeKnown: input.timeKnown,
    dayBoundary: input.settings.dayBoundary,
    gender: input.gender,
    lunarSource: input.calendar === "lunar" ? { year: input.year, month: input.month, day: input.day, isLeapMonth: input.isLeapMonth } : null,
  };
  const probes: EngineInput[] = [];
  if (input.timeKnown) {
    time = normalizeBirthTime(at(solarDate, input.hour!, input.minute!), input.settings, input.longitude, input.timeZone);
    probes.push({ ...base, termTime: time.termTime, pillarTime: time.pillarTime });
  } else {
    // 시간 미상: 하루의 시작과 끝을 각각 계산해 하루 안에서 바뀌는 기둥(절입일 등)을 찾는다.
    // 일주는 자시(23시) 관법 영향을 피하려고 22:59를 끝점으로 쓴다.
    probes.push({ ...base, termTime: at(solarDate, 0, 0), pillarTime: at(solarDate, 0, 0) });
    probes.push({ ...base, termTime: at(solarDate, 23, 59), pillarTime: at(solarDate, 22, 59) });
  }

  // 3) 엔진 실행 (엔진끼리는 병렬)
  const runAll = (list: SajuEngine[]) =>
    Promise.all(list.map(async (e) => Promise.all(probes.map((p) => runEngine(e, p, ctx)))));
  let perEngine = await runAll(engines);

  const evaluate = (results: EngineOutcome[][]) => {
    const outcomes = results.map((r) => {
      const failed = r.find((o) => !o.ok);
      return failed ?? r[0];
    });
    const ambiguous = new Set<CoreField>();
    if (!input.timeKnown) {
      for (const r of results) {
        if (r.length < 2 || !r[0].ok || !r[1].ok) continue;
        for (const f of ["year", "month", "day"] as CoreField[]) {
          const a = r[0].result!.pillars[f];
          const b = r[1].result!.pillars[f];
          if (a && b && (a.stem !== b.stem || a.branch !== b.branch)) ambiguous.add(f);
        }
      }
    }
    const report = crossValidate(outcomes, {
      timeKnown: input.timeKnown,
      hasGender: !!input.gender,
      lunarStatus: lunar?.status ?? null,
      ambiguousFields: [...ambiguous],
      minEngines,
    });
    return { outcomes, report };
  };

  let { outcomes, report } = evaluate(perEngine);

  // 4) 단일 출처: 흐름이 응답하지 못하면 앱 내장 엔진으로 계산한다 (흐름 호출은 hrumPost 가 이미 한 번 더 시도함)
  if (minEngines === 1 && engines[0]?.getEngineMetadata().id === "hrum" && !outcomes.some((o) => o.ok && !(o.validationErrors?.length ?? 0))) {
    const failed = outcomes[0];
    resolutionLog.push(`흐름 계산 실패(${failed?.errorCode ?? (failed?.validationErrors?.length ? "VALIDATION_FAILED" : "알 수 없음")}) → 앱 내장 엔진(manseryeok)으로 계산`);
    const fallback = [manseryeokEngine as SajuEngine];
    const rerun = await runAll(fallback);
    perEngine = [...perEngine, ...rerun];
    engines = [...engines, ...fallback];
    ({ outcomes, report } = evaluate(perEngine));
    metas = engines.map((e) => e.getEngineMetadata());
    // 대체 결과는 흐름 기준 캐시에 넣지 않는다 → 같은 입력을 다시 계산할 때 흐름을 다시 시도
    cacheKey = computeCacheKey(userId, input, fallback.map((e) => e.getEngineMetadata()));
  }

  // 5) 교차검증(엔진 2개 이상)일 때만: 불일치·실패 시 해소 절차
  if (minEngines >= 2 && (report.status === "MISMATCH" || report.status === "UNVERIFIABLE")) {
    resolutionLog.push(`1차 판정 ${report.status}: ${report.reasons.join(", ")}`);
    resolutionLog.push(
      `입력 재확인: termTime=${JSON.stringify(probes[0].termTime)}, pillarTime=${JSON.stringify(probes[0].pillarTime)}, 관법=${input.settings.dayBoundary}, 보정=${input.settings.correction}`,
    );
    resolutionLog.push(`엔진 기준: ${metas.map((m) => `${m.id}@${m.version}`).join(", ")}`);
    // 결정적인 로컬 라이브러리는 재계산해도 같으므로, 실패했거나 원격인 엔진만 같은 조건으로 1회 재계산한다.
    const retryIdx = engines
      .map((e, i) => ({ e, i }))
      .filter(({ e, i }) => e.getEngineMetadata().kind === "remote-api" || !outcomes[i].ok)
      .map(({ i }) => i);
    if (retryIdx.length) {
      const rerun = await runAll(retryIdx.map((i) => engines[i]));
      perEngine = perEngine.map((r, i) => {
        const k = retryIdx.indexOf(i);
        return k >= 0 ? rerun[k] : r;
      });
      ({ outcomes, report } = evaluate(perEngine));
      resolutionLog.push(`동일 조건 재계산(${retryIdx.map((i) => metas[i].id).join(", ")}) 후 판정 ${report.status}`);
    } else {
      resolutionLog.push("재계산 대상 없음 (로컬 엔진은 결정적이므로 재계산하지 않음)");
    }
    if (report.status === "MISMATCH" || report.status === "UNVERIFIABLE") {
      resolutionLog.push("해소되지 않아 해당 항목을 미확정 상태로 유지합니다.");
    }
  }

  const canonical = buildCanonical(report);
  const attributions = metas.filter((m) => m.attribution && outcomes.some((o) => o.engine === m.id && o.ok)).map((m) => m.attribution!);
  const computation: SajuComputation = {
    cacheKey,
    status: report.status,
    canonical,
    report,
    time,
    lunar,
    solarDate,
    engines: metas,
    outcomes,
    resolutionLog,
    attributions,
  };
  return computation;
}

/**
 * 특정 날짜(KST 정오)의 간지. 세운·일운 참고용이며 두 로컬 엔진이 연·월·일주 모두 일치할 때만 반환한다.
 */
export async function verifiedDateGanji(now = new Date()): Promise<{ date: string; year: string; month: string; day: string } | null> {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  const w = { year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1, day: kst.getUTCDate(), hour: 12, minute: 0 };
  const input: EngineInput = { solarDate: w, termTime: w, pillarTime: w, timeKnown: false, dayBoundary: "midnight", gender: null, lunarSource: null };
  const ctx: EngineContext = { fetchImpl: fetch, timeoutMs: 1000, maxRetries: 0 };
  const [a, b] = await Promise.all([runEngine(manseryeokEngine as SajuEngine, input, ctx), runEngine(lunarJavascriptEngine as SajuEngine, input, ctx)]);
  if (!a.ok || !b.ok) return null;
  const fields = ["year", "month", "day"] as const;
  const pa = a.result!.pillars;
  const pb = b.result!.pillars;
  for (const f of fields) {
    if (!pa[f] || !pb[f] || pa[f]!.stem !== pb[f]!.stem || pa[f]!.branch !== pb[f]!.branch) return null;
  }
  const str = (p: Pillar) => `${p.stem}${p.branch}`;
  return {
    date: `${w.year}-${String(w.month).padStart(2, "0")}-${String(w.day).padStart(2, "0")}`,
    year: str(pa.year!),
    month: str(pa.month!),
    day: str(pa.day!),
  };
}
