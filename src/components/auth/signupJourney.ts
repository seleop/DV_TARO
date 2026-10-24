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

/** 인증 화면의 지금 화면: 판단 전(pending)·최초 접속(intro)·버튼(choose)·로그인·회원가입 */
export type AuthScreen = "pending" | "intro" | "choose" | "login" | "signup";

/**
 * 인증 화면 전체 → 우주 유람의 장.
 *  - 최초 접속(터치 전): 은하 바깥 멀고 높은 곳에서 천천히 (터치하면 이메일 단계의 '진입'으로 다가간다)
 *  - 버튼 화면(가입·로그인한 적 있는 기기): 별똥별이 날아가는 기본 유람
 *  - 로그인: 이메일=진입, 비밀번호=별똥별이 밝아짐
 *  - 회원가입: 단계별 (signupJourneyStage)
 */
export function authJourneyStage(screen: AuthScreen, field: SignupField, done: boolean): JourneyStage {
  switch (screen) {
    case "pending":
    case "intro":
      return "intro";
    case "choose":
      return "cruise";
    case "login":
      return field === "password" ? "ignite" : "enter";
    case "signup":
      return signupJourneyStage(field, done);
  }
}
