import "server-only";
import { anonId } from "../crypto";
import { asService, toMs } from "../db";

export type UsageKind = "ai" | "calc" | "engine";

export interface UsageEntry {
  userId: string;
  kind: UsageKind;
  provider?: string | null;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  costUsdEst?: number;
  durationMs?: number;
  ok: boolean;
  errorCode?: string | null;
  promptVersion?: string | null;
}

/** 사용량 기록. 사용자 ID 대신 HMAC 익명 ID만 저장하고 출생 정보·질문 내용은 남기지 않는다. */
export async function logUsage(e: UsageEntry) {
  await asService((q) =>
    q.query(
      `insert into public.usage_logs (user_anon, kind, provider, model, input_tokens, output_tokens, cost_usd_est, duration_ms, ok, error_code, prompt_version)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        anonId(e.userId),
        e.kind,
        e.provider ?? null,
        e.model ?? null,
        e.inputTokens ?? 0,
        e.outputTokens ?? 0,
        e.costUsdEst ?? 0,
        Math.round(e.durationMs ?? 0),
        e.ok,
        e.errorCode ?? null,
        e.promptVersion ?? null,
      ],
    ),
  );
}

export async function countUserUsage(userId: string, kind: UsageKind, sinceMs: number): Promise<number> {
  const [r] = await asService((q) =>
    q.query<{ c: number }>("select count(*)::int as c from public.usage_logs where user_anon = $1 and kind = $2 and created_at >= $3", [
      anonId(userId),
      kind,
      new Date(sinceMs),
    ]),
  );
  return r.c;
}

export async function totalCostSince(sinceMs: number): Promise<number> {
  const [r] = await asService((q) =>
    q.query<{ s: number }>("select coalesce(sum(cost_usd_est), 0)::float8 as s from public.usage_logs where created_at >= $1", [new Date(sinceMs)]),
  );
  return Number(r.s);
}

export function startOfMonthKst(t = Date.now()): number {
  const k = new Date(t + 9 * 3600_000);
  return Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), 1) - 9 * 3600_000;
}

export function startOfDayKst(t = Date.now()): number {
  const k = new Date(t + 9 * 3600_000);
  return Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - 9 * 3600_000;
}

/** 보존 기간이 지난 데이터 정리 (Vercel Cron → /api/cron/purge) */
export async function purgeOldData(usageRetentionDays: number) {
  return asService(async (q) => {
    const usage = await q.query("delete from public.usage_logs where created_at < now() - make_interval(days => $1) returning id", [usageRetentionDays]);
    const invites = await q.query(
      "delete from public.invitations where used_at is null and (revoked_at is not null or expires_at < now()) and created_at < now() - interval '30 days' returning id",
    );
    const audit = await q.query("delete from public.admin_audit where created_at < now() - interval '365 days' returning id");
    return { usage: usage.length, invitations: invites.length, audit: audit.length };
  });
}

// ── 관리자 통계 (집계만) ──
export async function aiUsageStats(sinceMs: number) {
  return asService(async (q) => {
    const since = new Date(sinceMs);
    const [totals] = await q.query<Record<string, number>>(
      `select count(*)::int as calls, count(*) filter (where ok)::int as ok_calls,
         coalesce(sum(input_tokens), 0)::float8 as input_tokens, coalesce(sum(output_tokens), 0)::float8 as output_tokens,
         coalesce(sum(cost_usd_est), 0)::float8 as cost, coalesce(avg(duration_ms), 0)::float8 as avg_ms, count(distinct user_anon)::int as users
       from public.usage_logs where kind = 'ai' and created_at >= $1`,
      [since],
    );
    const byModel = await q.query(
      `select provider, model, prompt_version, count(*)::int as calls, coalesce(sum(cost_usd_est), 0)::float8 as cost
       from public.usage_logs where kind = 'ai' and created_at >= $1 group by provider, model, prompt_version order by calls desc`,
      [since],
    );
    const daily = await q.query(
      `select to_char(created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD') as day, count(*)::int as calls, coalesce(sum(cost_usd_est), 0)::float8 as cost
       from public.usage_logs where kind = 'ai' and created_at >= $1 group by day order by day`,
      [since],
    );
    const errors = (
      await q.query<{ kind: string; error_code: string; n: number; last_at: Date }>(
        `select kind, error_code, count(*)::int as n, max(created_at) as last_at from public.usage_logs
         where not ok and created_at >= $1 group by kind, error_code order by n desc limit 50`,
        [since],
      )
    ).map((r) => ({ ...r, last_at: toMs(r.last_at) }));
    return { totals, byModel, daily, errors };
  });
}

export async function engineStats(sinceMs: number) {
  return asService(async (q) => {
    const since = new Date(sinceMs);
    const perEngine = await q.query<{ engine: string; engine_version: string; runs: number; ok_runs: number; avg_ms: number }>(
      `select engine, engine_version, count(*)::int as runs, count(*) filter (where ok)::int as ok_runs, coalesce(avg(duration_ms), 0)::float8 as avg_ms
       from public.saju_engine_results where created_at >= $1 group by engine, engine_version order by engine`,
      [since],
    );
    const engineErrors = (
      await q.query<{ engine: string; error_code: string; n: number; last_at: Date }>(
        `select engine, error_code, count(*)::int as n, max(created_at) as last_at from public.saju_engine_results
         where not ok and created_at >= $1 group by engine, error_code order by n desc`,
        [since],
      )
    ).map((r) => ({ ...r, last_at: toMs(r.last_at) }));
    const statuses = await q.query<{ status: string; n: number }>(
      "select status, count(*)::int as n from public.saju_calculations where created_at >= $1 group by status",
      [since],
    );
    // 엔진별로 최종 확정값과 어긋난 필드 비율 (값 자체는 보지 않음)
    const rows = await q.query<{ engine: string; field_status: Record<string, { status: string; compared: boolean; agreesWithFinal: boolean }> }>(
      "select engine, field_status from public.saju_engine_results where ok and created_at >= $1",
      [since],
    );
    const disagreement: Record<string, { compared: number; disagreed: number }> = {};
    for (const r of rows) {
      const acc = (disagreement[r.engine] ??= { compared: 0, disagreed: 0 });
      for (const v of Object.values(r.field_status)) {
        if (!v.compared) continue;
        acc.compared += 1;
        if (v.status === "MISMATCH" || (!v.agreesWithFinal && v.status !== "UNVERIFIED")) acc.disagreed += 1;
      }
    }
    return { perEngine, engineErrors, statuses, disagreement };
  });
}

/** 최근 검증 실패 목록. 사용자·출생 정보 없이 상태·사유·설정·엔진 오류만 */
export async function recentVerificationIssues(limit = 50) {
  return asService(async (q) => {
    const calcs = await q.query<{ id: string; status: string; reasons: string[]; settings: Record<string, unknown>; engine_versions: unknown; rules_version: string; created_at: Date }>(
      `select id, status, reasons, settings, engine_versions, rules_version, created_at from public.saju_calculations
       where status <> 'MATCH' order by created_at desc limit $1`,
      [limit],
    );
    const out = [];
    for (const c of calcs) {
      const engines = await q.query<{ engine: string; ok: boolean; error_code: string | null; duration_ms: number; field_status: unknown }>(
        "select engine, ok, error_code, duration_ms, field_status from public.saju_engine_results where calculation_id = $1",
        [c.id],
      );
      out.push({
        ref: c.id.slice(0, 8),
        status: c.status,
        reasons: c.reasons,
        settings: c.settings,
        engineVersions: c.engine_versions,
        rulesVersion: c.rules_version,
        createdAt: toMs(c.created_at),
        engines: engines.map((e) => ({ engine: e.engine, ok: e.ok, errorCode: e.error_code, durationMs: e.duration_ms, fields: e.field_status })),
      });
    }
    return out;
  });
}
