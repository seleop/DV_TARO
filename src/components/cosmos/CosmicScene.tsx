"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { CameraJourney, JourneyTimer } from "./CameraJourney";
import { CosmicEffects } from "./CosmicEffects";
import { GalaxyField } from "./GalaxyField";
import { JourneyClock } from "./common";
import { cosmicBudget, createJourneyCurve } from "./journey";
import { MinorShootingStar, ShootingStar } from "./ShootingStar";

export type CosmicSceneProps = {
  /** false면 그리기를 멈춘다 (화면 밖·탭 숨김·페이드아웃이 끝났을 때) */
  running: boolean;
  /** false면 시간을 멈춘 정지 장면 (동작 줄이기 설정) */
  moving: boolean;
  onReady?: () => void;
  onContextLost?: () => void;
};

/**
 * 3D 우주 장면(Canvas). CosmicBackground가 브라우저에서만 지연 로딩한다.
 * 그리는 순서: 시계 → 별의 바다 → 성운·먼지 → 별똥별(주인공 1 + 보조) → 카메라.
 */
export default function CosmicScene({ running, moving, onReady, onContextLost }: CosmicSceneProps) {
  const budget = useMemo(
    () => cosmicBudget({ width: window.innerWidth, cores: navigator.hardwareConcurrency || 4, dpr: window.devicePixelRatio || 1 }),
    [],
  );
  const curve = useMemo(() => createJourneyCurve(), []);
  // 처음 보이는 장면이 은하를 가로지르는 구간이 되도록 조금 진행된 시점에서 시작한다
  const [clock] = useState(() => new JourneyClock(12));
  const pixelRatio = Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, budget.maxDpr);

  return (
    <Canvas
      frameloop={running ? "always" : "never"}
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
      <GalaxyField clock={clock} galaxyStars={budget.galaxyStars} farStars={budget.farStars} bandStars={budget.bandStars} pixelRatio={pixelRatio} />
      <CosmicEffects curve={curve} clock={clock} nebulae={budget.nebulae} bandClouds={budget.bandClouds} dust={budget.dust} pixelRatio={pixelRatio} />
      <ShootingStar curve={curve} clock={clock} />
      <MinorShootingStar seed={11} clock={clock} />
      {!budget.lite && <MinorShootingStar seed={29} clock={clock} />}
      <CameraJourney curve={curve} clock={clock} />
    </Canvas>
  );
}
