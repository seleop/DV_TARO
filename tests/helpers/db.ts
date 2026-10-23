import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { resetConfigForTests } from "@/lib/config";
import { setDbForTests, type Db, type Queryable } from "@/lib/db";
import { setAiProviderForTests } from "@/lib/ai/provider";
import { AuthAdminError, setAuthAdminForTests, type AuthAdmin } from "@/lib/supabase/admin";
import { signUp, type Role } from "@/lib/repo/users";

/**
 * 테스트용 Postgres (PGlite, 인메모리).
 * supabase/tests/auth_stub.sql 로 Supabase의 auth 스키마·역할을 흉내 낸 뒤,
 * supabase/migrations/*.sql 을 그대로 실행한다. → 운영 마이그레이션과 RLS 정책을 실제로 검증한다.
 */
const ROOT = path.resolve(import.meta.dirname, "../..");
let pg: PGlite | null = null;

async function getPg() {
  if (pg) return pg;
  pg = new PGlite();
  await pg.exec(readFileSync(path.join(ROOT, "supabase/tests/auth_stub.sql"), "utf8"));
  const dir = path.join(ROOT, "supabase/migrations");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    await pg.exec(readFileSync(path.join(dir, f), "utf8"));
  }
  return pg;
}

export function pgliteDb(p: PGlite): Db {
  const wrap = (x: { query: PGlite["query"] }): Queryable => ({
    query: async <T,>(text: string, params: unknown[] = []) => (await x.query<T>(text, params as unknown[])).rows,
  });
  return { ...wrap(p), transaction: (fn) => p.transaction((tx) => fn(wrap(tx))) };
}

/** 테스트용 Supabase Auth 관리자: auth.users 스텁 테이블을 직접 다룬다. */
export const fakeAuthAdmin: AuthAdmin & { banned: Set<string>; passwords: Map<string, { id: string; password: string }> } = {
  banned: new Set(),
  passwords: new Map(),
  async createUser(email, password) {
    const p = await getPg();
    try {
      const r = await p.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]);
      this.passwords.set(email, { id: r.rows[0].id, password });
      return r.rows[0].id;
    } catch {
      throw new AuthAdminError("EMAIL_TAKEN", "이미 가입된 이메일입니다.");
    }
  },
  async deleteUser(id) {
    await (await getPg()).query("delete from auth.users where id = $1", [id]);
  },
  async setBanned(id, banned) {
    if (banned) this.banned.add(id);
    else this.banned.delete(id);
  },
};

/** 매 테스트마다 데이터를 비우고 설정을 다시 읽는다. */
const RESET_KEYS = ["SIGNUP_MODE", "ADMIN_EMAILS"];

export async function freshEnv(env: Record<string, string> = {}) {
  // 테스트 사이에 가입 방식 설정이 남지 않도록 기본값으로 되돌린다
  for (const k of RESET_KEYS) if (!(k in env)) delete process.env[k];
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  resetConfigForTests();
  setAiProviderForTests(null);
  const p = await getPg();
  await p.exec("truncate auth.users, public.invitations, public.usage_logs, public.admin_audit cascade");
  setDbForTests(pgliteDb(p));
  setAuthAdminForTests(fakeAuthAdmin);
  fakeAuthAdmin.banned.clear();
  fakeAuthAdmin.passwords.clear();
}

export async function rawPg() {
  return getPg();
}

let seq = 0;
export async function makeUser(role: Role = "user") {
  seq += 1;
  const user = await signUp(fakeAuthAdmin, { email: `user${seq}@example.test`, password: "test-password-123", displayName: `사용자${seq}` });
  if (role === "admin") {
    await (await getPg()).query("update public.profiles set role = 'admin' where id = $1", [user.id]);
    return { ...user, role };
  }
  return user;
}
