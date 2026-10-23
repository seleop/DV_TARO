import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { signedInUserOrNull } from "@/lib/auth/auth-page";
import { getSignupMode } from "@/lib/auth/signup-mode";

export const metadata: Metadata = { title: "회원가입" };

/** 가입 링크(/signup)를 공유할 수 있는 화면. 요청 시점에 SIGNUP_MODE를 읽는다. */
export default async function SignupPage() {
  await connection();
  if (await signedInUserOrNull()) redirect("/");
  return <SignupForm mode={getSignupMode()} />;
}
