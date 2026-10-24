"use client";

import dynamic from "next/dynamic";
import { Component, useState, useSyncExternalStore, type ReactNode } from "react";
import { Constellation } from "./Constellation";

/** 3D 장면(three·@react-three/fiber)은 회원가입에 들어갈 때만 내려받는다. 서버에서는 그리지 않는다 */
const CosmosScene = dynamic(() => import("./cosmos/CosmosScene"), { ssr: false, loading: () => null });

/**
 * 회원가입 중 위쪽 무대를 채우는 우주 (2026-10-24 사용자 결정: 가입 중에만 우주로 전환).
 * - 3D를 쓸 수 있으면 CosmosScene(성운·별·은하·단계별 별자리)
 * - WebGL 미지원·동작 줄이기 설정·그래픽 끊김(context lost)·오류이면 기존 SVG 별자리(Constellation)
 * - 3D를 내려받는 동안에도 SVG 별자리를 먼저 보여 주고, 3D가 준비되면 겹쳐 바꾼다
 * 가입 화면이 아니면 투명해지고 그리기를 멈춘다(한 번 띄운 뒤에는 다시 들어올 때 바로 보이도록 남겨 둔다).
 */
export function SignupCosmos({ active, total, step, done }: { active: boolean; total: number; step: number; done: boolean }) {
  const webgl = useSyncExternalStore(noop, hasWebGL, () => false);
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const visible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState !== "hidden", () => true);
  const [everActive, setEverActive] = useState(active);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  if (active && !everActive) setEverActive(true);

  const use3d = webgl && !reduced && !failed;
  const show3d = use3d && ready;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden transition-[opacity,transform] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none ${
        active ? "translate-y-0 opacity-100" : "-translate-y-1/4 opacity-0"
      }`}
    >
      {/* 밤하늘 바탕 (보라·남색). 3D 성운·별은 이 위에 그려진다 */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_60%_20%,#3b1d78_0%,#1b1550_45%,#0b0a2a_100%)]" />
      {use3d && everActive && (
        <SceneBoundary onError={() => setFailed(true)}>
          {/* 남은 무대 크기를 따라간다: 키보드가 올라와 무대가 줄어도 별자리가 입력 영역 뒤로 숨지 않게 카메라 화면도 함께 줄어든다 */}
          <div className={`absolute inset-0 transition-opacity duration-700 ${show3d ? "opacity-100" : "opacity-0"}`}>
            <CosmosScene running={active && visible} total={total} step={step} done={done} onReady={() => setReady(true)} onContextLost={() => setFailed(true)} />
          </div>
        </SceneBoundary>
      )}
      {/* 대체용 SVG 별자리 (위치는 기존 가입 화면과 같게: 머리 영역 아래 무대 위쪽) */}
      <div className={`absolute inset-x-6 top-[calc(3.5rem+3%)] h-[55%] transition-opacity duration-700 ${show3d ? "opacity-0" : "opacity-100"}`}>
        <Constellation total={total} lit={step} current={step} done={done} />
      </div>
    </div>
  );
}

/** 3D 장면에서 오류가 나도 가입 화면이 깨지지 않게 막고, SVG 별자리로 대신한다 */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.error(`[signup-cosmos] 3D 장면 오류 → SVG 별자리로 대체: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const noop = () => () => {};

let webglCache: boolean | null = null;
/** WebGL을 쓸 수 있는지 (한 번만 검사) */
function hasWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    webglCache = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
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
