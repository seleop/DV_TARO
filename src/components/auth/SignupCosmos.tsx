"use client";

import { useState } from "react";
import type { SignupField } from "@/lib/auth/validate";
import { CosmicBackground } from "../cosmos/CosmicBackground";
import { Constellation } from "./Constellation";
import { signupJourneyStage } from "./signupJourney";

/**
 * 회원가입 중 위쪽 무대를 채우는 우주 (2026-10-24 사용자 결정: 가입 중에만 우주로 전환).
 * - 배경: 우주 유람(CosmicBackground). AuthFlow의 기존 상태(지금 입력칸·완료 여부)만 읽어 장을 바꾼다
 *   이메일=진입, 비밀번호·확인=별똥별이 밝아지고 다른 경로로, 닉네임=보라 성운·별빛 입자, 초대 코드·동의=은하 중심부로,
 *   완료=중심의 빛으로 들어가며 사라짐
 * - 진행 표시: 기존 SVG 별자리를 그대로 위에 겹친다 (단계마다 별이 켜짐)
 * - 3D를 못 쓰거나 오류가 나도 CosmicBackground가 정적인 우주 배경으로 대신하므로 가입은 그대로 진행된다
 * - 터치를 가로채지 않는다(pointer-events-none). 3D는 회원가입에 처음 들어갈 때 내려받고, 가입 화면이 아니면 그리기를 멈춘다
 */
export function SignupCosmos({ active, field, total, step, done }: { active: boolean; field: SignupField; total: number; step: number; done: boolean }) {
  const [everActive, setEverActive] = useState(active);
  if (active && !everActive) setEverActive(true);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden transition-[opacity,transform] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none ${
        active ? "translate-y-0 opacity-100" : "-translate-y-1/4 opacity-0"
      }`}
    >
      {everActive ? (
        // 가입이 끝나면(done) 별똥별이 은하 중심으로 들어가는 동안 우주가 서서히 사라진다
        <CosmicBackground active={active && !done} stage={signupJourneyStage(field, done)} />
      ) : (
        <div className="absolute inset-0 bg-[#03051a]" />
      )}
      {/* 진행 표시: 기존 SVG 별자리 (위치는 기존 가입 화면과 같게: 머리 영역 아래 무대 위쪽) */}
      <div className="absolute inset-x-6 top-[calc(3.5rem+3%)] h-[55%] opacity-90">
        <Constellation total={total} lit={step} current={step} done={done} />
      </div>
    </div>
  );
}
