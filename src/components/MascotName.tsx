"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_MASCOT_NAME } from "@/lib/mascot-name";

/**
 * 사용자가 지어 준 마스코트 이름을 화면 어디서나 쓰게 한다 ((app)/layout 이 로그인한 사용자의 이름으로 감싼다).
 * 로그인 전 화면처럼 감싸지 않은 곳에서는 기본 이름("별이").
 */
const Ctx = createContext<{ name: string; named: boolean } | null>(null);

export function MascotNameProvider({ name, children }: { name: string | null; children: ReactNode }) {
  return <Ctx.Provider value={{ name: name || DEFAULT_MASCOT_NAME, named: !!name }}>{children}</Ctx.Provider>;
}

/** 화면에 보일 마스코트 이름 */
export function useMascotName() {
  return useContext(Ctx)?.name ?? DEFAULT_MASCOT_NAME;
}

/** 사용자가 이름을 지었는지 (아직이면 홈에서 한 번 물어본다) */
export function useMascotNamed() {
  return useContext(Ctx)?.named ?? true;
}
