"use client";

import type { SignupField } from "@/lib/auth/validate";
import { CosmicBackground } from "../cosmos/CosmicBackground";
import type { BirthField } from "./birthSteps";
import { Constellation } from "./Constellation";
import { authJourneyStage, type AuthScreen } from "./signupJourney";

/**
 * 인증 화면 전체의 배경: 우주 유람 (2026-10-24 사용자 결정: 첫 화면·버튼 화면·로그인·회원가입·출생 정보 모두 우주).
 * - 배경: CosmicBackground. AuthFlow의 기존 상태(지금 화면·입력칸·완료 여부)만 읽어 장을 바꾼다 (authJourneyStage)
 * - 진행 표시: 회원가입·출생 정보 중에만 실존 별자리(전갈자리)를 위에 겹친다 (단계를 마치면 빛이 다음 별로 흐르며 선을 긋는다)
 * - 단계를 마칠 때마다(beat) 워프하며 다음 구도로 휘돌아 들어가고, 하늘 색조가 바뀌고, 빛의 충격파가 퍼진다
 * - 별자리가 완성돼도(done) 우주는 그대로 두고, 마지막 답을 고르면(leaving) 별똥별이 은하 중심의 빛으로 들어간다
 * - 3D를 못 쓰거나 오류가 나도 CosmicBackground가 정적인 우주 배경으로 대신하므로 가입·로그인은 그대로 진행된다
 * - 화면 전체(아래 시트 뒤까지)를 덮고, 터치를 가로채지 않는다(pointer-events-none)
 */
export function AuthCosmos({
  screen,
  field,
  total,
  lit,
  current,
  done,
  leaving,
  beat,
}: {
  screen: AuthScreen;
  field: SignupField | BirthField;
  total: number;
  lit: number;
  current: number;
  /** 별자리 완성 */
  done: boolean;
  /** 마지막 답을 골라 떠나는 중: 별똥별이 은하 중심의 빛으로 들어간다 */
  leaving: boolean;
  /** 지금까지 마친 단계 수 (바뀔 때마다 워프·다음 구도·하늘 색조·충격파) */
  beat?: number;
}) {
  const asking = screen === "signup" || screen === "birth";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#03051a]">
      <CosmicBackground stage={authJourneyStage(screen, field, leaving)} beat={beat} />
      {/* 진행 표시: 머리 영역 아래 무대 위쪽 */}
      <div
        className={`absolute inset-x-6 top-[calc(3.5rem+2%)] h-[44%] transition-opacity duration-700 motion-reduce:transition-none ${asking ? "opacity-80" : "opacity-0"}`}
      >
        <Constellation total={total} lit={asking ? lit : 0} current={current} done={done} />
      </div>
    </div>
  );
}
