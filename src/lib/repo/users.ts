import "server-only";
import { getConfig } from "../config";
import { randomInviteCode, sha256 } from "../crypto";
import { asService, asUser, toMs } from "../db";
import { AuthAdminError, type AuthAdmin } from "../supabase/admin";

export type Role = "user" | "admin";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  status: "active" | "disabled";
  primaryCalculationId: string | null;
  createdAt: number;
}

export class AuthError extends Error {
  constructor(
    public readonly code: "INVALID_INVITE" | "SIGNUP_CLOSED" | "EMAIL_TAKEN" | "WEAK_PASSWORD" | "INVALID_EMAIL" | "INVALID_CREDENTIALS" | "DISABLED" | "AUTH_FAILED",
    message: string,
  ) {
    super(message);
  }
}

export function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string;
  role: Role;
  status: "active" | "disabled";
  primary_calculation_id: string | null;
  created_at: Date;
}

const toUser = (r: ProfileRow): User => ({
  id: r.id,
  email: r.email ?? "",
  displayName: r.display_name,
  role: r.role,
  status: r.status,
  primaryCalculationId: r.primary_calculation_id,
  createdAt: toMs(r.created_at),
});

// ── 초대 ──
export async function createInvitation(adminId: string | null, role: Role, memo: string | null, ttlDays = 14) {
  const code = randomInviteCode();
  const [row] = await asService((q) =>
    q.query<{ id: string; expires_at: Date }>(
      `insert into public.invitations (code_hash, role, memo, created_by, expires_at)
       values ($1, $2, $3, $4, now() + make_interval(days => $5)) returning id, expires_at`,
      [sha256(normalizeInviteCode(code)), role, memo, adminId, ttlDays],
    ),
  );
  if (adminId) await audit(adminId, "invite.create", row.id);
  // 코드는 이때 한 번만 반환하고 DB에는 해시만 남긴다.
  return { id: row.id, code, expiresAt: toMs(row.expires_at) };
}

export async function listInvitations() {
  const rows = await asService((q) =>
    q.query<{ id: string; role: Role; memo: string | null; created_at: Date; expires_at: Date; used_at: Date | null; revoked_at: Date | null; used_by_name: string | null; expired: boolean }>(
      `select i.id, i.role, i.memo, i.created_at, i.expires_at, i.used_at, i.revoked_at, p.display_name as used_by_name, i.expires_at < now() as expired
       from public.invitations i left join public.profiles p on p.id = i.used_by
       order by i.created_at desc limit 200`,
    ),
  );
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    memo: r.memo,
    used_by_name: r.used_by_name,
    created_at: toMs(r.created_at),
    expires_at: toMs(r.expires_at),
    state: (r.used_at ? "used" : r.revoked_at ? "revoked" : r.expired ? "expired" : "pending") as "used" | "revoked" | "expired" | "pending",
  }));
}

export async function revokeInvitation(adminId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const rows = await asService((q) =>
    q.query("update public.invitations set revoked_at = now() where id = $1 and used_at is null and revoked_at is null returning id", [id]),
  );
  if (rows.length) await audit(adminId, "invite.revoke", id);
  return rows.length > 0;
}

// ── 가입 ──
/**
 * 이메일·비밀번호·닉네임 가입.
 * SIGNUP_MODE
 *  - open   : 누구나 가입 (기본)
 *  - invite : 초대 코드 필요. 조건부 UPDATE로 초대를 원자적으로 예약하므로 같은 코드로 두 명이 가입할 수 없다
 *  - closed : 가입 중지 (인원이 다 모이면 닫는다)
 * ADMIN_EMAILS 에 있는 이메일은 관리자 권한으로 가입된다.
 * 외부 Auth 호출 동안 DB 트랜잭션·잠금을 쥐고 있지 않고, 이후 단계가 실패하면 만든 Auth 계정을 지우고 예약을 되돌린다.
 */
export async function signUp(
  admin: AuthAdmin,
  input: { email: string; password: string; displayName: string; inviteCode?: string | null },
): Promise<User> {
  const cfg = getConfig();
  const email = input.email.trim().toLowerCase();
  if (cfg.SIGNUP_MODE === "closed") throw new AuthError("SIGNUP_CLOSED", "지금은 회원가입을 받지 않아요. 관리자에게 문의하세요.");

  let invite: { id: string; role: Role } | null = null;
  if (cfg.SIGNUP_MODE === "invite") {
    if (!input.inviteCode) throw new AuthError("INVALID_INVITE", "초대 코드를 입력하세요.");
    [invite] = await asService((q) =>
      q.query<{ id: string; role: Role }>(
        `update public.invitations set used_at = now()
         where code_hash = $1 and used_at is null and revoked_at is null and expires_at > now()
         returning id, role`,
        [sha256(normalizeInviteCode(input.inviteCode!))],
      ),
    );
    if (!invite) throw new AuthError("INVALID_INVITE", "유효하지 않거나 만료된 초대 코드입니다.");
  }
  const release = () =>
    invite ? asService((q) => q.query("update public.invitations set used_at = null where id = $1 and used_by is null", [invite!.id])).catch(() => undefined) : Promise.resolve();
  const role: Role = cfg.ADMIN_EMAILS.includes(email) || invite?.role === "admin" ? "admin" : "user";

  let userId: string;
  try {
    userId = await admin.createUser(email, input.password);
  } catch (e) {
    await release();
    if (e instanceof AuthAdminError && (e.code === "EMAIL_TAKEN" || e.code === "WEAK_PASSWORD" || e.code === "INVALID_EMAIL")) throw new AuthError(e.code, e.message);
    throw new AuthError("AUTH_FAILED", "계정을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  try {
    await asService(async (q) => {
      await q.query("insert into public.profiles (id, display_name, role) values ($1, $2, $3)", [userId, input.displayName, role]);
      if (invite) await q.query("update public.invitations set used_by = $1 where id = $2", [userId, invite.id]);
    });
  } catch (e) {
    await admin.deleteUser(userId).catch(() => undefined);
    await release();
    throw e;
  }
  return { id: userId, email, displayName: input.displayName, role, status: "active", primaryCalculationId: null, createdAt: Date.now() };
}

/** ADMIN_EMAILS 에 있는데 아직 일반 사용자라면 관리자로 올린다 (로그인 시 호출). */
export async function promoteIfConfiguredAdmin(user: User): Promise<User> {
  if (user.role === "admin" || !getConfig().ADMIN_EMAILS.includes(user.email.toLowerCase())) return user;
  await asService((q) => q.query("update public.profiles set role = 'admin' where id = $1", [user.id]));
  return { ...user, role: "admin" };
}

export async function updateDisplayName(userId: string, displayName: string) {
  await asService((q) => q.query("update public.profiles set display_name = $1 where id = $2", [displayName, userId]));
}

// ── 조회 ──
export async function getProfile(userId: string): Promise<User | null> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const [row] = await asService((q) =>
    q.query<ProfileRow>(
      `select p.id, u.email, p.display_name, p.role, p.status, p.primary_calculation_id, p.created_at
       from public.profiles p join auth.users u on u.id = p.id where p.id = $1`,
      [userId],
    ),
  );
  return row ? toUser(row) : null;
}

/** 사용자 권한(RLS)으로 본인 프로필을 읽는다. RLS 정책 검증에도 쓴다. */
export async function getOwnProfileViaRls(userId: string) {
  const rows = await asUser(userId, (q) => q.query<{ id: string; display_name: string }>("select id, display_name from public.profiles"));
  return rows;
}

export async function touchLastSeen(userId: string) {
  await asService((q) => q.query("update public.profiles set last_seen_at = now() where id = $1 and (last_seen_at is null or last_seen_at < now() - interval '10 minutes')", [userId]));
}

/** 관리자 목록: 개인 사주·운세 내용 없이 계정 정보와 건수만 */
export async function listUsersForAdmin() {
  const rows = await asService((q) =>
    q.query<{ id: string; email: string; display_name: string; role: Role; status: string; created_at: Date; last_seen_at: Date | null; calc_count: number; reading_count: number }>(
      `select p.id, u.email, p.display_name, p.role, p.status, p.created_at, p.last_seen_at,
         (select count(*)::int from public.saju_calculations c where c.user_id = p.id) as calc_count,
         (select count(*)::int from public.fortune_readings r where r.user_id = p.id) as reading_count
       from public.profiles p join auth.users u on u.id = p.id order by p.created_at`,
    ),
  );
  return rows.map((r) => ({ ...r, created_at: toMs(r.created_at), last_login_at: r.last_seen_at ? toMs(r.last_seen_at) : null }));
}

export async function setUserStatus(admin: AuthAdmin, adminId: string, userId: string, status: "active" | "disabled") {
  if (adminId === userId && status === "disabled") throw new Error("자기 자신은 비활성화할 수 없습니다.");
  await asService((q) => q.query("update public.profiles set status = $1 where id = $2", [status, userId]));
  await admin.setBanned(userId, status === "disabled");
  await audit(adminId, `user.${status}`, userId);
}

export async function setUserRole(adminId: string, userId: string, role: Role) {
  if (adminId === userId && role !== "admin") throw new Error("자기 자신의 관리자 권한은 해제할 수 없습니다.");
  await asService((q) => q.query("update public.profiles set role = $1 where id = $2", [role, userId]));
  await audit(adminId, `user.role.${role}`, userId);
}

/** 대표 사주 지정. 본인 계산인지 RLS로 확인한 뒤 프로필에 기록한다. */
export async function setPrimaryCalculation(userId: string, calculationId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(calculationId)) return false;
  const owned = await asUser(userId, (q) => q.query("select id from public.saju_calculations where id = $1", [calculationId]));
  if (!owned.length) return false;
  await asService((q) => q.query("update public.profiles set primary_calculation_id = $1 where id = $2", [calculationId, userId]));
  return true;
}

/** 계정 삭제: Auth 계정을 지우면 profiles 이하 모든 행이 CASCADE로 삭제된다. */
export async function deleteUser(admin: AuthAdmin, userId: string) {
  await admin.deleteUser(userId);
}

export async function audit(adminId: string, action: string, target: string | null) {
  await asService((q) => q.query("insert into public.admin_audit (admin_id, action, target) values ($1, $2, $3)", [adminId, action, target]));
}
