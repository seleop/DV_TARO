import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { signedInUserOrNull } from "@/lib/auth/auth-page";
import { safeNextPath } from "@/lib/auth/next-path";
import { getSignupMode } from "@/lib/auth/signup-mode";

export const metadata: Metadata = { title: "로그인" };

/**
 * 첫 진입 화면: 로그인·회원가입 두 버튼 → 누르면 한 칸씩 입력.
 * 요청 시점에 렌더링한다(searchParams 사용). 빌드 때 환경변수를 요구하지 않으므로
 * 환경변수가 빠져도 빌드는 실패하지 않는다. SIGNUP_MODE만 읽는다.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNextPath((await searchParams).next);
  if (await signedInUserOrNull()) redirect(next);
  return <AuthFlow initialMode="choose" next={next} signupMode={getSignupMode()} />;
}
