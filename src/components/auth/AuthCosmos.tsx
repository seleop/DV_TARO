"use client";

import type { SignupField } from "@/lib/auth/validate";
import { CosmicBackground } from "../cosmos/CosmicBackground";
import { Constellation } from "./Constellation";
import { authJourneyStage, type AuthScreen } from "./signupJourney";

/**
 * 인증 화면 전체의 배경: 우주 유람 (2026-10-24 사용자 결정: 첫 화면·버튼 화면·로그인·회원가입 모두 우주).
 * - 배경: CosmicBackground. AuthFlow의 기존 상태(지금 화면·입력칸·완료 여부)만 읽어 장을 바꾼다 (authJourneyStage)
 * - 진행 표시: 회원가입일 때만 SVG 별자리를 위에 겹친다 (단계를 마치면 빛이 다음 별로 흐르며 선을 긋는다)
 * - 3D를 못 쓰거나 오류가 나도 CosmicBackground가 정적인 우주 배경으로 대신하므로 가입·로그인은 그대로 진행된다
 * - 화면 전체(아래 시트 뒤까지)를 덮고, 터치를 가로채지 않는다(pointer-events-none). 가입이 끝나면(done) 서서히 사라진다
 */
export function AuthCosmos({ screen, field, total, step, done }: { screen: AuthScreen; field: SignupField; total: number; step: number; done: boolean }) {
  const signup = screen === "signup";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#03051a]">
      <CosmicBackground active={!done} stage={authJourneyStage(screen, field, done)} />
      {/* 진행 표시: 머리 영역 아래 무대 위쪽 */}
      <div
        className={`absolute inset-x-6 top-[calc(3.5rem+3%)] h-[42%] transition-opacity duration-700 motion-reduce:transition-none ${signup ? "opacity-90" : "opacity-0"}`}
      >
        <Constellation total={total} lit={signup ? step : 0} current={step} done={done} />
      </div>
    </div>
  );
}
