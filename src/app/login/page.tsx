import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { signedInUserOrNull } from "@/lib/auth/auth-page";
import { safeNextPath } from "@/lib/auth/next-path";
import { getSignupMode } from "@/lib/auth/signup-mode";

export const metadata: Metadata = { title: "로그인" };

/**
 * 첫 진입 화면(우주 배경): 이 기기에서 가입·로그인한 적이 없으면 터치 한 번으로 회원가입 1단계,
 * 있으면 로그인·회원가입 두 버튼 → 누르면 한 칸씩 입력. 어느 쪽인지는 브라우저에서 정한다(AuthFlow).
 * 요청 시점에 렌더링한다(searchParams 사용). 빌드 때 환경변수를 요구하지 않으므로
 * 환경변수가 빠져도 빌드는 실패하지 않는다. SIGNUP_MODE만 읽는다.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNextPath((await searchParams).next);
  if (await signedInUserOrNull()) redirect(next);
  return <AuthFlow initialMode="entry" next={next} signupMode={getSignupMode()} />;
}
