"use client";

import dynamic from "next/dynamic";
import { Component, useState, useSyncExternalStore, type ReactNode } from "react";
import type { JourneyStage } from "./stages";

/** 3D 장면(three·@react-three/fiber)은 브라우저에서 이 배경을 쓸 때만 내려받는다 */
const CosmicScene = dynamic(() => import("./CosmicScene"), { ssr: false, loading: () => null });

/**
 * 타로 우주 배경: 은하수·성운 속을 별똥별이 유람하고, 카메라가 그 뒤를 따라간다.
 * 부모 요소를 꽉 채우는(absolute inset-0) 장식 레이어라 글자·버튼 뒤에 깔면 된다. 터치는 가로채지 않는다.
 *
 * - stage: 지금 장(회원가입 단계 등). 바꾸면 하나의 연속된 공간 안에서 카메라·별똥별 연출이 부드럽게 옮겨 간다
 * - active=false로 바꾸면 부드럽게 사라진 뒤 그리기를 멈춘다(다시 true면 이어서 나타남)
 * - 처음 준비되면 어둠 속에서 서서히 나타난다
 * - 탭이 숨겨지면 그리기를 멈춘다. '동작 줄이기' 설정이면 움직이지 않는 정지 장면
 * - WebGL을 못 쓰거나 3D에서 오류·그래픽 끊김이 나면 정적인 우주색 그라데이션으로 대신한다
 */
export function CosmicBackground({ active = true, stage = "cruise", className = "" }: { active?: boolean; stage?: JourneyStage; className?: string }) {
  const webgl = useSyncExternalStore(noop, hasWebGL, () => false);
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState !== "hidden", () => true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // 사라지는 전환이 끝나면 그리기를 멈춘다. 다시 보이게 되면 곧바로 이어서 그린다
  const [rested, setRested] = useState(false);
  if (active && rested) setRested(false);

  const use3d = webgl && !failed;
  const shown = active && ready;

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#03051a] ${className}`}>
      {/* 3D를 쓸 수 없거나 준비 중일 때 보이는 바탕 (딥 네이비 → 미드나이트 블루, 바이올렛 빛) */}
      <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_70%_25%,rgba(124,92,255,0.28),transparent_70%),radial-gradient(70%_50%_at_20%_80%,rgba(60,80,200,0.22),transparent_70%),linear-gradient(180deg,#070a2c_0%,#03051a_100%)]" />
      {use3d && (
        <SceneBoundary onError={() => setFailed(true)}>
          <div
            className={`absolute inset-0 transition-opacity ease-out motion-reduce:transition-none ${shown ? "opacity-100 duration-[2400ms]" : "opacity-0 duration-[1600ms]"}`}
            onTransitionEnd={() => {
              if (!active) setRested(true);
            }}
          >
            <CosmicScene
              running={pageVisible && (active || !rested)}
              moving={!reduced}
              stage={stage}
              onReady={() => setReady(true)}
              onContextLost={() => setFailed(true)}
            />
          </div>
        </SceneBoundary>
      )}
    </div>
  );
}

/** 3D 장면 오류가 화면 전체를 깨뜨리지 않게 막고 정적 배경으로 대신한다 */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.error(`[cosmic-background] 3D 장면 오류 → 정적 배경으로 대체: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const noop = () => () => {};

let webglCache: boolean | null = null;
/** WebGL을 쓸 수 있는지 (한 번만 검사하고 검사용 컨텍스트는 바로 놓아 준다) */
function hasWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGLRenderingContext | null;
    webglCache = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(cb: () => void) {
  const m = window.matchMedia(REDUCED);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
function prefersReducedMotion() {
  return window.matchMedia(REDUCED).matches;
}

function subscribeVisibility(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}
