/**
 * 가입 진행 표시에 쓰는 실존 별자리 (2026-10-24 사용자 요청: 총 단계 수에 맞는 실제 별자리 모양).
 * 별마다 실제 적경(시)·적위(도)를 넣고 화면 좌표로 투영한다. 하늘 지도처럼 동쪽(적경이 큰 쪽)이 왼쪽이다.
 * 별은 켜지는 순서대로 놓고, 각 별은 이미 켜진 별 하나(from)에서 빛의 실로 이어진다.
 *
 * 전갈자리: 머리(β·δ·π) → 심장 안타레스(α) → 몸통(τ·ε·μ·ζ·η) → 꼬리(θ·κ) → 독침(λ 샤울라).
 * 가입 5단계 + 출생 정보 7단계 = 12개, 초대 코드가 있으면 13개. 12개일 때는 머리의 π를 뺀다.
 */
type Star = { name: string; ra: number; dec: number; from: string | null };

const SCORPIUS: Star[] = [
  { name: "β", ra: 16.09, dec: -19.8, from: null },
  { name: "δ", ra: 16.0, dec: -22.6, from: "β" },
  { name: "π", ra: 15.98, dec: -26.1, from: "δ" },
  { name: "σ", ra: 16.35, dec: -25.6, from: "δ" },
  { name: "α", ra: 16.49, dec: -26.4, from: "σ" },
  { name: "τ", ra: 16.6, dec: -28.2, from: "α" },
  { name: "ε", ra: 16.84, dec: -34.3, from: "τ" },
  { name: "μ", ra: 16.86, dec: -38.0, from: "ε" },
  { name: "ζ", ra: 16.9, dec: -42.4, from: "μ" },
  { name: "η", ra: 17.2, dec: -43.2, from: "ζ" },
  { name: "θ", ra: 17.62, dec: -43.0, from: "η" },
  { name: "κ", ra: 17.71, dec: -39.0, from: "θ" },
  { name: "λ", ra: 17.56, dec: -37.1, from: "κ" },
];

export type ConstellationStar = { x: number; y: number; from: number | null; name: string };
export type ConstellationShape = { name: string; stars: ConstellationStar[] };

/** 화면 좌표 범위 (SVG viewBox 0 0 300 300, 가장자리 여백 24) */
const VIEW = 300;
const PAD = 24;

/** 적경·적위 → 화면 좌표: 별자리 가운데 적위의 cos으로 가로 길이를 보정하고, 긴 쪽이 화면에 맞게 키운다 */
function project(stars: Star[], name: string): ConstellationShape {
  const midDec = (Math.max(...stars.map((s) => s.dec)) + Math.min(...stars.map((s) => s.dec))) / 2;
  const k = Math.cos((midDec * Math.PI) / 180);
  // 동쪽(적경이 큰 쪽)이 왼쪽, 북쪽(적위가 큰 쪽)이 위
  const raw = stars.map((s) => ({ x: -s.ra * 15 * k, y: -s.dec }));
  const minX = Math.min(...raw.map((p) => p.x));
  const maxX = Math.max(...raw.map((p) => p.x));
  const minY = Math.min(...raw.map((p) => p.y));
  const maxY = Math.max(...raw.map((p) => p.y));
  const scale = (VIEW - PAD * 2) / Math.max(maxX - minX, maxY - minY);
  const offX = (VIEW - (maxX - minX) * scale) / 2;
  const offY = (VIEW - (maxY - minY) * scale) / 2;
  const index = new Map(stars.map((s, i) => [s.name, i]));
  return {
    name,
    stars: stars.map((s, i) => ({
      name: s.name,
      x: Math.round(((raw[i].x - minX) * scale + offX) * 10) / 10,
      y: Math.round(((raw[i].y - minY) * scale + offY) * 10) / 10,
      from: s.from === null ? null : (index.get(s.from) ?? null),
    })),
  };
}

const SHAPES: Record<number, ConstellationShape> = {
  12: project(
    SCORPIUS.filter((s) => s.name !== "π"),
    "전갈자리",
  ),
  13: project(SCORPIUS, "전갈자리"),
};

/** 별 개수에 맞는 별자리. 정해 둔 개수가 아니면 가장 가까운 큰 별자리의 앞부분을 쓴다 */
export function constellationFor(count: number): ConstellationShape {
  if (SHAPES[count]) return SHAPES[count];
  const bigger = Object.keys(SHAPES)
    .map(Number)
    .sort((a, b) => a - b)
    .find((n) => n >= count);
  const base = SHAPES[bigger ?? 13];
  return { name: base.name, stars: base.stars.slice(0, count) };
}

export const CONSTELLATION_VIEW = VIEW;
