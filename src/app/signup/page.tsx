import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { signedInUserOrNull } from "@/lib/auth/auth-page";
import { getSignupMode } from "@/lib/auth/signup-mode";

export const metadata: Metadata = { title: "회원가입" };

/** 가입 링크(/signup)로 들어오면 바로 회원가입 입력(우주 유람)으로 시작한다. 가입 중지면 진입 화면을 보여 준다. */
export default async function SignupPage() {
  await connection();
  if (await signedInUserOrNull()) redirect("/");
  const mode = getSignupMode();
  return <AuthFlow initialMode={mode === "closed" ? "entry" : "signup"} next="/" signupMode={mode} />;
}
