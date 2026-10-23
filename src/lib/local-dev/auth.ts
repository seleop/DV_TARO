import "server-only";
import { cookies } from "next/headers";
import { hashPassword, hmac, verifyPassword } from "../crypto";
import { asService } from "../db";
import type { AuthAdmin } from "../supabase/admin";
import { AuthAdminError } from "../supabase/admin";
import type { AuthClient } from "../supabase/server";

/**
 * 로컬 체험 모드 전용 간이 인증. Supabase Auth의 최소 기능만 흉내 낸다.
 * 세션은 "사용자ID.서명" 쿠키(HMAC, httpOnly)이며 프로덕션에서는 이 코드가 실행되지 않는다(config에서 차단).
 */
const COOKIE = "fs_local_session";
const sign = (userId: string) => `${userId}.${hmac(`local-session:${userId}`)}`;

export async function createLocalAuthClient(): Promise<AuthClient> {
  const store = await cookies();
  return {
    auth: {
      async getClaims() {
        const raw = store.get(COOKIE)?.value;
        const userId = raw?.split(".")[0];
        if (!raw || !userId || raw !== sign(userId)) return { sub: null };
        const [u] = await asService((q) => q.query<{ banned: boolean }>("select banned from auth.users where id = $1", [userId]));
        return { sub: u && !u.banned ? userId : null };
      },
      async signInWithPassword(email, password) {
        const [u] = await asService((q) =>
          q.query<{ id: string; banned: boolean; password_hash: string }>(
            "select u.id, u.banned, p.password_hash from auth.users u join auth.local_passwords p on p.user_id = u.id where u.email = $1",
            [email],
          ),
        );
        if (!u || u.banned || !(await verifyPassword(password, u.password_hash))) return { userId: null };
        try {
          store.set(COOKIE, sign(u.id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
        } catch {
          /* 서버 컴포넌트에서는 쿠키를 쓸 수 없다 */
        }
        return { userId: u.id };
      },
      async signOut() {
        try {
          store.delete(COOKIE);
        } catch {
          /* 무시 */
        }
      },
    },
  };
}

export const localAuthAdmin: AuthAdmin = {
  async createUser(email, password) {
    const hash = await hashPassword(password);
    try {
      return await asService(async (q) => {
        const [u] = await q.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]);
        await q.query("insert into auth.local_passwords (user_id, password_hash) values ($1, $2)", [u.id, hash]);
        return u.id;
      });
    } catch {
      throw new AuthAdminError("EMAIL_TAKEN", "이미 가입된 이메일입니다.");
    }
  },
  async deleteUser(id) {
    await asService((q) => q.query("delete from auth.users where id = $1", [id]));
  },
  async setBanned(id, banned) {
    await asService((q) => q.query("update auth.users set banned = $1 where id = $2", [banned, id]));
  },
};
