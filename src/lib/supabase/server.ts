import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getConfig, requireConfig } from "../config";

/**
 * 앱이 쓰는 인증 기능만 모은 인터페이스.
 * 운영에서는 Supabase Auth(@supabase/ssr), 로컬 체험 모드에서는 간이 구현을 쓴다.
 */
export interface AuthClient {
  auth: {
    /** 검증된 JWT의 사용자 ID (없거나 무효면 null) */
    getClaims(): Promise<{ sub: string | null }>;
    signInWithPassword(email: string, password: string): Promise<{ userId: string | null }>;
    signOut(): Promise<void>;
  };
}

/**
 * 요청 쿠키에 묶인 인증 클라이언트 (서버 컴포넌트·라우트 핸들러용).
 * 인증 확인은 getClaims()로 한다 (getSession()은 쿠키를 재검증하지 않으므로 서버에서 신뢰하지 않는다).
 */
export async function createSupabaseServerClient(): Promise<AuthClient> {
  // 쿠키를 먼저 읽어 이 요청을 동적 렌더링으로 고정한다 (빌드 시 정적 사전 렌더링 방지).
  const cookieStore = await cookies();
  if (getConfig().LOCAL_DEV_MODE) {
    const { createLocalAuthClient } = await import("../local-dev/auth");
    return createLocalAuthClient();
  }
  const supabase = createServerClient(requireConfig("NEXT_PUBLIC_SUPABASE_URL"), requireConfig("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 세션 갱신은 proxy.ts가 맡는다.
        }
      },
    },
  });
  return {
    auth: {
      async getClaims() {
        const { data, error } = await supabase.auth.getClaims();
        const sub = !error ? data?.claims?.sub : null;
        return { sub: typeof sub === "string" ? sub : null };
      },
      async signInWithPassword(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return { userId: !error && data.user ? data.user.id : null };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    },
  };
}
