import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getConfig, requireConfig } from "../config";
import { localAuthAdmin } from "../local-dev/auth";

/**
 * Supabase Auth 관리자 작업. secret key는 서버 환경변수에만 둔다.
 * 공개 가입은 Supabase 대시보드에서 꺼 두고, 앱 서버의 가입 API(입력 검증·가입 방식 확인)를 거친 경우에만 여기서 계정을 만든다.
 */
export interface AuthAdmin {
  /** 계정 생성 후 사용자 ID 반환 */
  createUser(email: string, password: string): Promise<string>;
  deleteUser(id: string): Promise<void>;
  /** 비활성화 시 로그인 자체를 막는다 */
  setBanned(id: string, banned: boolean): Promise<void>;
}

export class AuthAdminError extends Error {
  constructor(
    public readonly code: "EMAIL_TAKEN" | "WEAK_PASSWORD" | "INVALID_EMAIL" | "AUTH_ADMIN_FAILED",
    message: string,
  ) {
    super(message);
  }
}

function createSupabaseAuthAdmin(): AuthAdmin {
  const client = createClient(requireConfig("NEXT_PUBLIC_SUPABASE_URL"), requireConfig("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    async createUser(email, password) {
      const { data, error } = await client.auth.admin.createUser({ email, password, email_confirm: true });
      if (error || !data.user) {
        if (error?.code === "email_exists" || error?.code === "user_already_exists") throw new AuthAdminError("EMAIL_TAKEN", "이미 가입된 이메일입니다.");
        if (error?.code === "email_address_invalid" || error?.code === "validation_failed") throw new AuthAdminError("INVALID_EMAIL", "사용할 수 없는 이메일 주소예요. 다른 주소를 입력해 주세요.");
        if (error?.code === "weak_password") throw new AuthAdminError("WEAK_PASSWORD", "비밀번호가 너무 약합니다. 더 길고 복잡하게 정해 주세요.");
        throw new AuthAdminError("AUTH_ADMIN_FAILED", "계정을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
      return data.user.id;
    },
    async deleteUser(id) {
      const { error } = await client.auth.admin.deleteUser(id);
      if (error) throw new AuthAdminError("AUTH_ADMIN_FAILED", "계정을 삭제하지 못했습니다.");
    },
    async setBanned(id, banned) {
      const { error } = await client.auth.admin.updateUserById(id, { ban_duration: banned ? "876000h" : "none" });
      if (error) throw new AuthAdminError("AUTH_ADMIN_FAILED", "계정 상태를 바꾸지 못했습니다.");
    },
  };
}

let admin: AuthAdmin | null = null;
export function getAuthAdmin(): AuthAdmin {
  return (admin ??= getConfig().LOCAL_DEV_MODE ? localAuthAdmin : createSupabaseAuthAdmin());
}
export function setAuthAdminForTests(a: AuthAdmin | null) {
  admin = a;
}
