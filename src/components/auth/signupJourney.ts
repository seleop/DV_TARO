import type { SignupField } from "@/lib/auth/validate";
import type { JourneyStage } from "../cosmos/stages";

/**
 * 회원가입의 현재 입력칸(AuthFlow의 기존 상태) → 우주 유람의 장.
 * 가입 상태를 따로 만들지 않고, 지금 단계의 입력칸과 완료 여부만 읽어 바꾼다.
 *  - 이메일 → 은하수로 진입
 *  - 비밀번호·비밀번호 확인 → 별똥별이 밝아지고 다른 곡선 경로로
 *  - 닉네임 → 보라 성운이 가까워지고 별빛 입자가 모임
 *  - 초대 코드(초대 모드만)·개인정보 동의(마지막 확인) → 은하 중심부로
 *  - 가입 완료 → 은하 중심의 빛으로 들어가며 사라짐
 */
export function signupJourneyStage(field: SignupField, done: boolean): JourneyStage {
  if (done) return "arrive";
  switch (field) {
    case "email":
      return "enter";
    case "password":
    case "passwordConfirm":
      return "ignite";
    case "displayName":
      return "nebula";
    case "inviteCode":
    case "agreePrivacy":
      return "core";
  }
}
