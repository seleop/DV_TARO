import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PATH_HEADER } from "@/lib/auth/next-path";

/**
 * 요청마다 Supabase 세션 쿠키를 갱신한다 (Next.js 16의 proxy = 이전 middleware).
 * 접근 제어 자체는 서버 컴포넌트·API 라우트에서 getClaims()로 다시 확인한다.
 * 서버 컴포넌트가 로그인 후 돌아올 경로(?next=)를 만들 수 있도록 현재 경로를 요청 헤더로 넘긴다.
 */
export async function proxy(request: NextRequest) {
  request.headers.set(PATH_HEADER, currentPath(request));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

/** 경로 + 쿼리. 클라이언트 내비게이션용 내부 파라미터(_rsc)는 뺀다. */
function currentPath(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const params = new URLSearchParams(searchParams);
  params.delete("_rsc");
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|pwa-icon|manifest.webmanifest|character/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
