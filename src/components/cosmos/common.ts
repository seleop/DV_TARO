/** 우주 배경 컴포넌트들이 함께 쓰는 시계·빛 텍스처 */

/**
 * 장면 공용 시계. 한 컴포넌트(JourneyTimer)만 매 프레임 advance()로 앞으로 보내고, 나머지는 읽기만 한다.
 * time: 유람이 흐른 시간(초), dt: 이번 프레임에 흐른 시간(초).
 */
export class JourneyClock {
  time: number;
  dt = 0;
  constructor(start = 0) {
    this.time = start;
  }
  advance(step: number) {
    this.dt = step;
    this.time += step;
  }
}

/** 부드러운 원형 빛(별똥별 머리·은하 중심용). stops: 가운데 → 바깥 색 */
export function glowCanvas(stops: string[], size = 128): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const r = size / 2;
  const grd = g.createRadialGradient(r, r, 0, r, r, r);
  stops.forEach((s, i) => grd.addColorStop(i / (stops.length - 1), s));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
}
