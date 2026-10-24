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

/**
 * 십자 빛 별(가로·세로 긴 빛줄기 + 대각선 짧은 빛줄기 + 둥근 빛). 별똥별 머리·밝은 별용.
 * 흰색으로 그려 두고 재질 색(color)으로 물들인다.
 */
export function flareCanvas(size = 128): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const r = size / 2;
  g.globalCompositeOperation = "lighter";
  const glow = g.createRadialGradient(r, r, 0, r, r, r * 0.5);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.25, "rgba(255,255,255,0.45)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, size, size);
  const ray = (angle: number, len: number, width: number, alpha: number) => {
    g.save();
    g.translate(r, r);
    g.rotate(angle);
    const grd = g.createLinearGradient(-len, 0, len, 0);
    grd.addColorStop(0, "rgba(255,255,255,0)");
    grd.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(-len, 0);
    g.lineTo(0, -width);
    g.lineTo(len, 0);
    g.lineTo(0, width);
    g.closePath();
    g.fill();
    g.restore();
  };
  ray(0, r, size * 0.035, 1);
  ray(Math.PI / 2, r, size * 0.035, 1);
  ray(Math.PI / 4, r * 0.5, size * 0.02, 0.6);
  ray(-Math.PI / 4, r * 0.5, size * 0.02, 0.6);
  return c;
}

/** 빛의 고리(충격파용): 가운데는 비고 테두리가 밝으며 바깥으로 흐려진다 */
export function ringCanvas(size = 128): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const r = size / 2;
  const grd = g.createRadialGradient(r, r, r * 0.55, r, r, r);
  grd.addColorStop(0, "rgba(255,255,255,0)");
  grd.addColorStop(0.55, "rgba(255,255,255,0.9)");
  grd.addColorStop(0.7, "rgba(255,255,255,0.35)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
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

/** 0~size 범위로 감는다 (음수도) */
export function wrap(v: number, size: number) {
  return v - Math.floor(v / size) * size;
}

/** edge0~edge1 사이 부드러운 0→1 */
export function smooth(edge0: number, edge1: number, x: number) {
  const k = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return k * k * (3 - 2 * k);
}
