"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { CameraJourney, JourneyDirector, JourneyTimer } from "./CameraJourney";
import { CosmicEffects } from "./CosmicEffects";
import { GalaxyField } from "./GalaxyField";
import { JourneyClock } from "./common";
import { cosmicBudget, createJourneyCurve } from "./journey";
import { MinorShootingStar, ShootingStar, SparkleTrail } from "./ShootingStar";
import { AsteroidField, NearDebris, Planets } from "./Planets";
import { Comet } from "./Comet";
import { AdaptiveQuality } from "./AdaptiveQuality";
import { Shockwave } from "./Shockwave";
import { ParallaxStars } from "./ParallaxStars";
import { FlybyComet, OncomingLights } from "./Oncoming";
import { SkyBox } from "./SkyBox";
import { SpeedStreaks } from "./SpeedStreaks";
import { Director, INTRO_VALUES, STAGE_TARGETS, createJourneyPaths, type JourneyStage } from "./stages";

export type CosmicSceneProps = {
  /** false면 그리기를 멈춘다 (화면 밖·탭 숨김·페이드아웃이 끝났을 때) */
  running: boolean;
  /** false면 시간을 멈춘 정지 장면 (동작 줄이기 설정) */
  moving: boolean;
  /** 지금 장 (회원가입 단계 등). 바뀌면 연출 값이 그 장의 목표로 부드럽게 옮겨 간다 */
  stage: JourneyStage;
  /** 지금까지 마친 단계 수 (바뀔 때마다 워프·다음 구도) */
  beat?: number;
  onReady?: () => void;
  onContextLost?: () => void;
};

/**
 * 3D 우주 장면(Canvas). CosmicBackground가 브라우저에서만 지연 로딩한다.
 * 매 프레임 순서: 시계 → 연출 감독(장 → 연출 값·별똥별 위치) → 카메라 → 카메라를 따라다니는 하늘·빛줄기 → 나머지.
 * 장면 구성(레퍼런스: 나선 은하·성운·행성·소행성·혜성·반짝이 꼬리의 별똥별·빛줄기). 깊이마다 움직임 속도가 달라 시차가 생긴다:
 *  가장 먼 층  하늘(나선 은하 5·성운·십자 빛 별·행성), 먼 별 껍질·은하수 띠
 *  먼~중간 층  은하 원반의 별, 은하수 띠 성운, 혜성, 행성
 *  중간 층     경로 둘레 성운(빛나는 구름·어두운 먼지 구름), 소행성 무리, 중간 별층
 *  가까운 층   가까운 별층·빛 알갱이, 가까이 스치는 구름·파편, 별똥별(주인공·반짝이 입자·보조), 빛줄기
 */
export default function CosmicScene({ running, moving, stage, beat, onReady, onContextLost }: CosmicSceneProps) {
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
      <color attach="background" args={["#050826"]} />
      {moving && <AdaptiveQuality min={0.75} max={budget.maxDpr} />}
      <JourneyTimer clock={clock} moving={moving} />
      <JourneyDirector director={director} paths={paths} stage={stage} beat={beat} clock={clock} moving={moving} />
      <CameraJourney director={director} paths={paths} clock={clock} />
      <SkyBox clock={clock} paths={paths} heroStars={budget.heroStars} skyNebulae={budget.skyNebulae} flares={budget.flares} pixelRatio={pixelRatio} />
      <GalaxyField clock={clock} director={director} galaxyStars={budget.galaxyStars} farStars={budget.farStars} bandStars={budget.bandStars} pixelRatio={pixelRatio} />
      <ParallaxStars clock={clock} near={budget.nearStars} mid={budget.midStars} bokeh={budget.bokeh} pixelRatio={pixelRatio} />
      <CosmicEffects curve={curve} clock={clock} director={director} nebulae={budget.nebulae} bandClouds={budget.bandClouds} wisps={budget.wisps} dust={budget.dust} pixelRatio={pixelRatio} />
      <Planets />
      <AsteroidField paths={paths} director={director} clock={clock} count={budget.asteroids} />
      <NearDebris director={director} clock={clock} count={budget.debris} />
      <Comet seed={5} clock={clock} />
      {budget.comets > 1 && <Comet seed={17} clock={clock} />}
      <ShootingStar director={director} paths={paths} clock={clock} />
      <Shockwave director={director} />
      <SparkleTrail director={director} clock={clock} capacity={budget.sparkleCapacity} rate={budget.sparkleRate} pixelRatio={pixelRatio} />
      <MinorShootingStar seed={11} clock={clock} />
      {!budget.lite && <MinorShootingStar seed={29} clock={clock} />}
      <SpeedStreaks director={director} clock={clock} count={budget.streaks} />
      <OncomingLights director={director} clock={clock} count={budget.oncoming} pixelRatio={pixelRatio} />
      {Array.from({ length: budget.flybys }, (_, i) => (
        <FlybyComet key={i} seed={7 + i * 13} director={director} clock={clock} />
      ))}
    </Canvas>
  );
}
