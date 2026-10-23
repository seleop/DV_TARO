import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Db, Queryable } from "../db";

/**
 * 로컬 체험 모드용 Postgres (PGlite, 파일 저장: LOCAL_DB_DIR).
 * Supabase와 같은 마이그레이션 SQL·RLS 정책을 그대로 실행하고, 적용한 마이그레이션은 local_dev.migrations 에 기록한다.
 */
type PG = import("@electric-sql/pglite").PGlite;

// Next 개발 서버는 서버 컴포넌트·라우트 핸들러를 별도 모듈 그래프로 로드할 수 있다.
// 같은 디렉터리를 PGlite 두 개가 열면 서로의 변경을 보지 못하므로 프로세스 전역에 하나만 둔다.
const g = globalThis as unknown as { __fortuneLocalPg?: Promise<PG> };

async function init(dir: string): Promise<PG> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite(dir);
  const root = process.cwd();
  const hasAuth = await pg.query<{ t: string | null }>("select to_regclass('auth.users')::text as t");
  if (!hasAuth.rows[0].t) await pg.exec(readFileSync(path.join(root, "supabase/tests/auth_stub.sql"), "utf8"));
  await pg.exec("create schema if not exists local_dev; create table if not exists local_dev.migrations (name text primary key, applied_at timestamptz not null default now());");
  const applied = new Set((await pg.query<{ name: string }>("select name from local_dev.migrations")).rows.map((r) => r.name));
  const mig = path.join(root, "supabase/migrations");
  for (const f of readdirSync(mig).filter((x) => x.endsWith(".sql")).sort()) {
    if (applied.has(f)) continue;
    await pg.exec(readFileSync(path.join(mig, f), "utf8"));
    await pg.query("insert into local_dev.migrations (name) values ($1)", [f]);
    console.log(`[로컬 체험 모드] 마이그레이션 적용: ${f}`);
  }
  return pg;
}

export function createLocalDb(dir: string): Db {
  const pg = () => (g.__fortuneLocalPg ??= init(dir));
  const wrap = (x: { query: PG["query"] }): Queryable => ({
    query: async <T,>(text: string, params: unknown[] = []) => (await x.query<T>(text, params)).rows,
  });
  return {
    query: async (text, params) => wrap(await pg()).query(text, params),
    transaction: async (fn) => (await pg()).transaction((tx) => fn(wrap(tx))),
  };
}
