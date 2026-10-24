"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, type Sprite, type SpriteMaterial } from "three";
import { glowCanvas, ringCanvas } from "./common";
import type { Director } from "./stages";

const RING_S = 1.3;
const FLASH_S = 0.55;
const WHITE = new Color(1, 1, 1);

/**
 * 단계 완료 순간의 빛 퍼짐: 별똥별에서 빛의 고리(충격파)가 크게 퍼지며 옅어지고, 잠깐 둥근 빛이 번쩍인다.
 * 색은 그 단계의 하늘 색조를 따른다. 단계 완료(Director.kick) 때만 나타난다.
 */
export function Shockwave({ director }: { director: Director }) {
  const ring = useRef<Sprite>(null);
  const ring2 = useRef<Sprite>(null);
  const flash = useRef<Sprite>(null);
  const ringTex = useMemo(() => ringCanvas(128), []);
  const flashTex = useMemo(() => glowCanvas(["rgba(255,255,255,0.9)", "rgba(255,255,255,0.35)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0)"], 64), []);

  useFrame(() => {
    const age = director.time - director.kickAt;
    const items: Array<[Sprite | null, number, number, number]> = [
      // [스프라이트, 지연(초), 최대 크기, 최대 밝기]
      [ring.current, 0, 16, 0.75],
      [ring2.current, 0.18, 10, 0.45],
    ];
    for (const [s, delay, size, peak] of items) {
      if (!s) continue;
      const k = (age - delay) / RING_S;
      s.visible = k >= 0 && k < 1;
      if (!s.visible) continue;
      const e = 1 - Math.pow(1 - k, 3);
      s.position.copy(director.star);
      s.scale.setScalar(0.6 + e * size);
      const m = s.material as SpriteMaterial;
      m.opacity = peak * Math.pow(1 - k, 1.6);
      m.color.copy(director.tintTarget).lerp(WHITE, 0.35);
    }
    const f = flash.current;
    if (f) {
      const k = age / FLASH_S;
      f.visible = k >= 0 && k < 1;
      if (f.visible) {
        f.position.copy(director.star);
        f.scale.setScalar(2.5 + k * 4);
        (f.material as SpriteMaterial).opacity = 0.55 * (1 - k) * (1 - k);
      }
    }
  });

  return (
    <group>
      <sprite ref={ring} visible={false} renderOrder={6}>
        <spriteMaterial transparent depthWrite={false} blending={AdditiveBlending}>
          <canvasTexture attach="map" args={[ringTex]} />
        </spriteMaterial>
      </sprite>
      <sprite ref={ring2} visible={false} renderOrder={6}>
        <spriteMaterial transparent depthWrite={false} blending={AdditiveBlending}>
          <canvasTexture attach="map" args={[ringTex]} />
        </spriteMaterial>
      </sprite>
      <sprite ref={flash} visible={false} renderOrder={6}>
        <spriteMaterial transparent depthWrite={false} blending={AdditiveBlending}>
          <canvasTexture attach="map" args={[flashTex]} />
        </spriteMaterial>
      </sprite>
    </group>
  );
}

