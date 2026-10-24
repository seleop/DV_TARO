import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { signedInUserOrNull } from "@/lib/auth/auth-page";
import { getSignupMode } from "@/lib/auth/signup-mode";

export const metadata: Metadata = { title: "시작하기" };

/**
 * 출생 정보 이어 하기 (2026-10-24 사용자 결정): 계정만 만들고 출생 정보를 넣기 전에 나갔던 사람이
 * 다시 들어오면 같은 우주 배경에서 출생 정보 단계부터 이어 한다. 생년월일이 필요한 화면은 모두 여기로 보낸다(session.ts).
 */
export default async function StartPage() {
  await connection();
  const user = await signedInUserOrNull();
  if (!user) redirect("/login");
  if (user.primaryCalculationId) redirect("/");
  return <AuthFlow initialMode="birth" next="/today" signupMode={getSignupMode()} />;
}
