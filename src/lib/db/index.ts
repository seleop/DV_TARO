import "server-only";
import postgres from "postgres";
import { getConfig, requireConfig } from "../config";
import { createLocalDb } from "../local-dev/db";

/**
 * Supabase Postgres 접근 계층.
 *
 * - asUser(userId, fn): 트랜잭션 안에서 `authenticated` 역할 + JWT claim(sub)을 설정한다.
 *   그래서 사용자 데이터 쿼리는 Supabase RLS 정책을 그대로 적용받는다 (서버 코드의 실수로 남의 행이 보이지 않음).
 * - asService(fn): 연결 기본 역할(postgres)로 실행. 초대·사용량·관리자 집계처럼 RLS 밖의 서버 전용 작업에만 쓴다.
 *
 * 테스트에서는 같은 인터페이스를 PGlite(인메모리 Postgres)로 구현해 실제 마이그레이션 SQL과 RLS를 검증한다.
 * 테이블별 목적과 보존 기간 → docs/DATA_POLICY.md
 */
export interface Queryable {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  transaction<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
}

let db: Db | null = null;

function createPostgresDb(url: string): Db {
  // Supabase transaction pooler(포트 6543)는 prepared statement를 지원하지 않는다.
  const sql = postgres(url, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10 });
  const wrap = (s: postgres.Sql | postgres.TransactionSql): Queryable => ({
    query: async <T,>(text: string, params: unknown[] = []) => (await s.unsafe(text, params as postgres.ParameterOrJSON<never>[])) as unknown as T[],
  });
  return {
    ...wrap(sql),
    transaction: (fn) => sql.begin((tx) => fn(wrap(tx))) as never,
  };
}

export function getDb(): Db {
  if (!db) {
    const cfg = getConfig();
    db = cfg.LOCAL_DEV_MODE ? createLocalDb(cfg.LOCAL_DB_DIR) : createPostgresDb(requireConfig("DATABASE_URL"));
  }
  return db;
}

export function setDbForTests(d: Db | null) {
  db = d;
}

/** 사용자 권한(RLS 적용)으로 실행 */
export function asUser<T>(userId: string, fn: (q: Queryable) => Promise<T>): Promise<T> {
  return getDb().transaction(async (q) => {
    await q.query("set local role authenticated");
    await q.query("select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)", [
      JSON.stringify({ sub: userId, role: "authenticated" }),
      userId,
    ]);
    return fn(q);
  });
}

/** 서버 전용 작업 (RLS 밖). 사용자 데이터에는 쓰지 않는다. */
export function asService<T>(fn: (q: Queryable) => Promise<T>): Promise<T> {
  return getDb().transaction(fn);
}

export const toMs = (v: unknown): number => (v instanceof Date ? v.getTime() : typeof v === "string" ? Date.parse(v) : Number(v));
