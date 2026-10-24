"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { CameraJourney, JourneyDirector, JourneyTimer } from "./CameraJourney";
import { CosmicEffects } from "./CosmicEffects";
import { GalaxyField } from "./GalaxyField";
import { JourneyClock } from "./common";
import { cosmicBudget, createJourneyCurve } from "./journey";
import { MinorShootingStar, ShootingStar } from "./ShootingStar";
import { Director, INTRO_VALUES, STAGE_TARGETS, createJourneyPaths, type JourneyStage } from "./stages";

export type CosmicSceneProps = {
  /** false면 그리기를 멈춘다 (화면 밖·탭 숨김·페이드아웃이 끝났을 때) */
  running: boolean;
  /** false면 시간을 멈춘 정지 장면 (동작 줄이기 설정) */
  moving: boolean;
  /** 지금 장 (회원가입 단계 등). 바뀌면 연출 값이 그 장의 목표로 부드럽게 옮겨 간다 */
  stage: JourneyStage;
  onReady?: () => void;
  onContextLost?: () => void;
};

/**
 * 3D 우주 장면(Canvas). CosmicBackground가 브라우저에서만 지연 로딩한다.
 * 그리는 순서: 시계 → 연출 감독(장 → 연출 값·별똥별 위치) → 별의 바다 → 성운·먼지 → 별똥별(주인공 1 + 보조) → 카메라.
 */
export default function CosmicScene({ running, moving, stage, onReady, onContextLost }: CosmicSceneProps) {
  const budget = useMemo(
    () => cosmicBudget({ width: window.innerWidth, cores: navigator.hardwareConcurrency || 4, dpr: window.devicePixelRatio || 1 }),
    [],
  );
  const curve = useMemo(() => createJourneyCurve(), []);
  const paths = useMemo(() => createJourneyPaths(curve), [curve]);
  // 장이 정해져 있으면(회원가입) 은하 바깥 멀고 높은 곳에서 시작해 첫 장의 자리로 다가온다(진입)
  const [director] = useState(() => new Director(stage === "cruise" ? STAGE_TARGETS.cruise : INTRO_VALUES, 0.08));
  // 처음 보이는 장면이 은하를 가로지르는 구간이 되도록 조금 진행된 시점에서 시작한다
  const [clock] = useState(() => new JourneyClock(12));
  const pixelRatio = Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, budget.maxDpr);

  return (
    <Canvas
      // 동작 줄이기면 정지 장면이라 필요할 때만 그린다
      frameloop={running ? (moving ? "always" : "demand") : "never"}
      dpr={[1, budget.maxDpr]}
      gl={{ antialias: false, alpha: false, powerPreference: "default" }}
      camera={{ fov: 55, near: 0.1, far: 900, position: [0, 4, 40] }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener(
          "webglcontextlost",
          (e) => {
            e.preventDefault();
            onContextLost?.();
          },
          { once: true },
        );
        onReady?.();
      }}
    >
      <color attach="background" args={["#03051a"]} />
      <JourneyTimer clock={clock} moving={moving} />
      <JourneyDirector director={director} paths={paths} stage={stage} clock={clock} moving={moving} />
      <GalaxyField clock={clock} director={director} galaxyStars={budget.galaxyStars} farStars={budget.farStars} bandStars={budget.bandStars} pixelRatio={pixelRatio} />
      <CosmicEffects curve={curve} clock={clock} director={director} nebulae={budget.nebulae} bandClouds={budget.bandClouds} dust={budget.dust} pixelRatio={pixelRatio} />
      <ShootingStar director={director} paths={paths} clock={clock} />
      <MinorShootingStar seed={11} clock={clock} />
      {!budget.lite && <MinorShootingStar seed={29} clock={clock} />}
      <CameraJourney director={director} paths={paths} clock={clock} />
    </Canvas>
  );
}
