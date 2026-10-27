import "server-only";
import { PRIVACY_CONSENT } from "@/config/privacy";
import { getConfig } from "./config";

/** 지금 버전의 개인정보 고지에 아직 동의하지 않았는지 (예전 버전 동의·기록 없음 모두 포함) */
export function needsPrivacyConsent(user: { privacyVersion: string | null }) {
  return user.privacyVersion !== PRIVACY_CONSENT.version;
}

/** 흐름(HRUM)으로 출생 정보·사주를 보내도 되는지: 키가 있고, 흐름 전송을 알린 지금 버전에 동의한 사용자만 */
export function hrumAllowedFor(user: { privacyVersion: string | null }) {
  return !!getConfig().HRUM_API_KEY && !needsPrivacyConsent(user);
}
