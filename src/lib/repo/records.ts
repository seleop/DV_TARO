import "server-only";
import { decryptJson, encryptJson } from "../crypto";
import { asUser, toMs } from "../db";
import type { SajuComputation } from "../saju/service";
import type { BirthInput } from "../saju/types";

/**
 * 사용자 소유 데이터 저장소.
 * 모든 함수는 asUser()로 실행되어 Supabase RLS(본인 행만)가 강제된다.
 * 추가로 쿼리에도 user_id 조건을 넣어 의도를 명시한다 (이중 방어).
 */

export interface StoredCalculation {
  id: string;
  label: string | null;
  input: BirthInput;
  result: SajuComputation;
  status: SajuComputation["status"];
  createdAt: number;
}

export async function findCalculationIdByCacheKey(userId: string, cacheKey: string): Promise<string | null> {
  const [r] = await asUser(userId, (q) =>
    q.query<{ id: string }>("select id from public.saju_calculations where user_id = $1 and cache_key = $2", [userId, cacheKey]),
  );
  return r?.id ?? null;
}

export async function updateCalculationLabel(userId: string, id: string, label: string | null) {
  await asUser(userId, (q) =>
    q.query("update public.saju_calculations set label_enc = $1 where id = $2 and user_id = $3", [label === null ? null : encryptJson(label), id, userId]),
  );
}

export async function saveCalculation(userId: string, input: BirthInput, c: SajuComputation, label: string | null): Promise<string> {
  const existing = await findCalculationIdByCacheKey(userId, c.cacheKey);
  if (existing) {
    if (label !== null) await updateCalculationLabel(userId, existing, label);
    return existing;
  }
  return asUser(userId, async (q) => {
    const [row] = await q.query<{ id: string }>(
      `insert into public.saju_calculations (user_id, cache_key, label_enc, input_enc, result_enc, status, reasons, settings, engine_versions, rules_version)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10) returning id`,
      [
        userId,
        c.cacheKey,
        label === null ? null : encryptJson(label),
        encryptJson(input),
        encryptJson(c),
        c.status,
        JSON.stringify(c.report.reasons),
        // 관리자 진단용 비식별 설정 (생년월일·시각 미포함)
        JSON.stringify({ calendar: input.calendar, leap: input.isLeapMonth, timeKnown: input.timeKnown, hasGender: !!input.gender, ...input.settings }),
        JSON.stringify(c.engines.map((e) => ({ id: e.id, version: e.version }))),
        c.report.rulesVersion,
      ],
    );
    for (const o of c.outcomes) {
      // 필드별 상태만 평문으로 둔다 (간지 값은 암호화된 normalized_enc 안에만 있다)
      const fieldStatus = Object.fromEntries(
        Object.entries(c.report.fields).map(([f, v]) => [
          f,
          {
            status: v.status,
            compared: v.compared.includes(o.engine),
            excludedReason: v.excluded.find((x) => x.engine === o.engine)?.reason ?? null,
            agreesWithFinal: v.agreedValue !== null && v.values[o.engine] === v.agreedValue,
          },
        ]),
      );
      await q.query(
        `insert into public.saju_engine_results (calculation_id, user_id, engine, engine_version, ok, error_code, duration_ms, normalized_enc, field_status)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [
          row.id,
          userId,
          o.engine,
          o.engineVersion,
          o.ok && !o.validationErrors?.length,
          o.errorCode ?? (o.validationErrors?.length ? "VALIDATION_FAILED" : null),
          o.durationMs,
          o.result ? encryptJson(o.result) : null,
          JSON.stringify(fieldStatus),
        ],
      );
    }
    return row.id;
  });
}

interface CalcRow {
  id: string;
  label_enc: string | null;
  input_enc: string;
  result_enc: string;
  status: SajuComputation["status"];
  created_at: Date;
}

export async function getCalculation(userId: string, id: string): Promise<StoredCalculation | null> {
  if (!isUuid(id)) return null;
  const [r] = await asUser(userId, (q) =>
    q.query<CalcRow>("select id, label_enc, input_enc, result_enc, status, created_at from public.saju_calculations where id = $1 and user_id = $2", [id, userId]),
  );
  if (!r) return null;
  return {
    id: r.id,
    label: r.label_enc ? decryptJson<string>(r.label_enc) : null,
    input: decryptJson<BirthInput>(r.input_enc),
    result: decryptJson<SajuComputation>(r.result_enc),
    status: r.status,
    createdAt: toMs(r.created_at),
  };
}

export async function listCalculations(userId: string) {
  const rows = await asUser(userId, (q) =>
    q.query<CalcRow & { has_reading: boolean }>(
      `select c.id, c.label_enc, c.result_enc, c.status, c.created_at,
         exists (select 1 from public.fortune_readings r where r.calculation_id = c.id and r.kind = 'saju') as has_reading
       from public.saju_calculations c where c.user_id = $1 order by c.created_at desc limit 100`,
      [userId],
    ),
  );
  return rows.map((r) => {
    const c = decryptJson<SajuComputation>(r.result_enc);
    return {
      id: r.id,
      label: r.label_enc ? decryptJson<string>(r.label_enc) : null,
      status: r.status,
      createdAt: toMs(r.created_at),
      dayPillar: c.canonical.pillars.day?.ganji ?? null,
      hasReading: !!r.has_reading,
    };
  });
}

/** 계산 삭제: 엔진 결과·연결된 운세가 CASCADE로 삭제되고, 대표 사주였다면 지정이 해제된다. */
export async function deleteCalculation(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const rows = await asUser(userId, (q) => q.query("delete from public.saju_calculations where id = $1 and user_id = $2 returning id", [id, userId]));
  return rows.length > 0;
}

// ── 운세 해석 기록 ──
export type ReadingKind = "saju" | "daily" | "tarot" | "horoscope";

export interface StoredReading<T = unknown> {
  id: string;
  kind: ReadingKind;
  calculationId: string | null;
  provider: string;
  model: string;
  promptVersion: string;
  content: T;
  createdAt: number;
}

export async function saveReading(
  userId: string,
  r: { kind: ReadingKind; calculationId: string | null; cacheKey: string | null; provider: string; model: string; promptVersion: string; content: unknown },
): Promise<string> {
  const [row] = await asUser(userId, (q) =>
    q.query<{ id: string }>(
      `insert into public.fortune_readings (user_id, calculation_id, kind, cache_key, provider, model, prompt_version, content_enc)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [userId, r.calculationId, r.kind, r.cacheKey, r.provider, r.model, r.promptVersion, encryptJson(r.content)],
    ),
  );
  return row.id;
}

interface ReadingRow {
  id: string;
  kind: ReadingKind;
  calculation_id: string | null;
  provider: string;
  model: string;
  prompt_version: string;
  content_enc: string;
  created_at: Date;
}

const toReading = <T>(r: ReadingRow): StoredReading<T> => ({
  id: r.id,
  kind: r.kind,
  calculationId: r.calculation_id,
  provider: r.provider,
  model: r.model,
  promptVersion: r.prompt_version,
  content: decryptJson<T>(r.content_enc),
  createdAt: toMs(r.created_at),
});

const READING_COLS = "id, kind, calculation_id, provider, model, prompt_version, content_enc, created_at";

export async function getReading<T>(userId: string, id: string): Promise<StoredReading<T> | null> {
  if (!isUuid(id)) return null;
  const [r] = await asUser(userId, (q) => q.query<ReadingRow>(`select ${READING_COLS} from public.fortune_readings where id = $1 and user_id = $2`, [id, userId]));
  return r ? toReading<T>(r) : null;
}

export async function getLatestReadingForCalculation<T>(userId: string, calculationId: string, kind: ReadingKind): Promise<StoredReading<T> | null> {
  const [r] = await asUser(userId, (q) =>
    q.query<ReadingRow>(
      `select ${READING_COLS} from public.fortune_readings where user_id = $1 and calculation_id = $2 and kind = $3 order by created_at desc limit 1`,
      [userId, calculationId, kind],
    ),
  );
  return r ? toReading<T>(r) : null;
}

export async function findReadingByCacheKey<T>(userId: string, cacheKey: string): Promise<StoredReading<T> | null> {
  const [r] = await asUser(userId, (q) =>
    q.query<ReadingRow>(`select ${READING_COLS} from public.fortune_readings where user_id = $1 and cache_key = $2 order by created_at desc limit 1`, [userId, cacheKey]),
  );
  return r ? toReading<T>(r) : null;
}

export async function listReadings(userId: string, kinds: ReadingKind[]) {
  const rows = await asUser(userId, (q) =>
    q.query<ReadingRow>(`select ${READING_COLS} from public.fortune_readings where user_id = $1 and kind = any($2::text[]) order by created_at desc limit 100`, [userId, kinds]),
  );
  return rows.map((r) => toReading<Record<string, unknown>>(r));
}

export async function deleteReading(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const rows = await asUser(userId, (q) => q.query("delete from public.fortune_readings where id = $1 and user_id = $2 returning id", [id, userId]));
  return rows.length > 0;
}

/**
 * 사용자의 출생 정보·운세 기록 전체 삭제 (계정은 유지).
 * 삭제 범위: saju_calculations, saju_engine_results(CASCADE), fortune_readings.
 * 유지: usage_logs(익명 ID·토큰 수·비용만 있고 출생 정보·내용 없음, 보존 기간 후 삭제).
 */
export async function deleteAllUserRecords(userId: string): Promise<{ calculations: number; readings: number }> {
  return asUser(userId, async (q) => {
    const readings = await q.query("delete from public.fortune_readings where user_id = $1 returning id", [userId]);
    const calcs = await q.query("delete from public.saju_calculations where user_id = $1 returning id", [userId]);
    return { calculations: calcs.length, readings: readings.length };
  });
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
