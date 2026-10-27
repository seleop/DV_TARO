import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/next-path";
import { needsPrivacyConsent } from "@/lib/privacy-consent";
import { ConsentClient } from "@/components/ConsentClient";

/** 개인정보 고지가 바뀐 뒤 기존 가입자가 다시 동의하는 화면 (requirePageUser 가 다른 화면에서 이리로 보낸다) */
export default async function ConsentPage({ searchParams }: PageProps<"/consent">) {
  const user = await requirePageUser();
  const { next } = await searchParams;
  const to = safeNextPath(typeof next === "string" ? next : "/");
  if (!needsPrivacyConsent(user)) redirect(to);
  return <ConsentClient next={to.startsWith("/consent") ? "/" : to} firstTime={!user.privacyVersion} />;
}
