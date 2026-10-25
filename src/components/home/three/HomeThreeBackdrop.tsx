"use client";

import dynamic from "next/dynamic";
import { Component, useState, useSyncExternalStore, type ReactNode } from "react";
import type { HomeThreeVariant } from "./HomeThreeScene";

/** three·@react-three/fiber 장면은 브라우저에서 이 배경을 쓸 때만 내려받는다 */
const HomeThreeScene = dynamic(() => import("./HomeThreeScene"), { ssr: false, loading: () => null });

/**
 * 홈 3D 밤하늘 배경 (시안 4~6). 장면 영역을 꽉 채우는 장식 층이라 터치를 가로채지 않는다.
 * - 준비되면 어둠 속에서 서서히 나타나고, 탭이 숨겨지면 그리기를 멈춘다
 * - '동작 줄이기' 설정이면 한 번만 그린 정지 장면
 * - WebGL을 못 쓰거나 3D 오류·그래픽 끊김이 나면 정적인 밤하늘 그라데이션만 보인다
 */
export function HomeThreeBackdrop({ variant }: { variant: HomeThreeVariant }) {
  const webgl = useSyncExternalStore(noop, hasWebGL, () => false);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  const visible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState !== "hidden", () => true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#05061f]">
      <div className="absolute inset-0 bg-[radial-gradient(80%_55%_at_50%_35%,rgba(124,92,255,0.3),transparent_70%),linear-gradient(180deg,#070828_0%,#120e3e_60%,#2a1d5e_100%)]" />
      {webgl && !failed && (
        <Boundary onError={() => setFailed(true)}>
          <div className={`absolute inset-0 transition-opacity duration-[1600ms] ease-out motion-reduce:transition-none ${ready ? "opacity-100" : "opacity-0"}`}>
            <HomeThreeScene variant={variant} running={visible} moving={!reduced} onReady={() => setReady(true)} onContextLost={() => setFailed(true)} />
          </div>
        </Boundary>
      )}
      {/* 별이가 서는 땅: 아래쪽 어두운 지평선 (3D 위에 얹어 시트와 이어지게) */}
      <svg viewBox="0 0 375 80" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[13%] w-full">
        <path d="M0 30 Q94 6 187 20 T375 16 V80 H0Z" fill="#1a1442" opacity=".92" />
        <path d="M0 30 Q94 6 187 20 T375 16" fill="none" stroke="#7b63d6" strokeWidth="1.2" opacity=".6" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

class Boundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const REDUCED = "(prefers-reduced-motion: reduce)";
const noop = () => () => {};

let webglCache: boolean | null = null;
function hasWebGL() {
  if (webglCache === null) {
    try {
      const c = document.createElement("canvas");
      webglCache = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webglCache = false;
    }
  }
  return webglCache;
}

function subscribeReduced(cb: () => void) {
  const m = window.matchMedia(REDUCED);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

function subscribeVisibility(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}
