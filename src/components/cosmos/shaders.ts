/**
 * 우주 배경 셰이더 (WebGL1·2 공통으로 동작하는 GLSL만 쓴다).
 * smoothstep은 항상 (작은 값, 큰 값) 순서로 쓴다 — 뒤집으면 GLSL 규격상 결과가 정해지지 않아 일부 기기에서 0이 된다.
 */

/** 별 입자: 거리에 따라 작아지고, 너무 멀어도 최소 크기는 남기며, 저마다 다른 박자로 반짝인다 */
export const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScale;
  uniform float uTwinkle;
  varying vec3 vColor;
  varying float vBright;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.6 + 0.4 * sin(uTime * (0.8 + fract(aPhase) * 1.6) + aPhase * 6.2831);
    vBright = mix(1.0, tw, uTwinkle);
    vColor = aColor;
    gl_PointSize = clamp(aSize * uPixelRatio * (uScale / -mv.z), 1.0, 24.0 * uPixelRatio);
  }
`;

export const STAR_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vBright;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = 1.0 - smoothstep(0.0, 0.18, d);
    float halo = 1.0 - smoothstep(0.0, 0.5, d);
    float a = (core * 0.85 + halo * halo * 0.45) * vBright;
    gl_FragColor = vec4(vColor * a, a);
  }
`;

/**
 * 먼지(별빛 입자): 별 입자와 같지만, uGather만큼 별똥별(uCenter) 주변 껍질로 모여든다.
 * 가까운 입자만 모이고(멀리 있는 것은 그대로), 입자마다 모이는 반지름이 달라 구름처럼 둘러싼다.
 */
export const DUST_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScale;
  uniform float uTwinkle;
  uniform vec3 uCenter;
  uniform float uGather;
  varying vec3 vColor;
  varying float vBright;
  void main() {
    vec3 d = position - uCenter;
    float r = max(length(d), 0.001);
    float near = 1.0 - smoothstep(18.0, 55.0, r);
    float shell = 1.6 + fract(aPhase * 7.13) * 4.5;
    // 별똥별 둘레를 천천히 도는 껍질 위치
    float a = uTime * 0.25 + aPhase * 6.2831;
    vec3 dir = d / r;
    vec3 swirl = vec3(dir.x * cos(a) - dir.z * sin(a), dir.y, dir.x * sin(a) + dir.z * cos(a));
    vec3 gathered = uCenter + swirl * shell;
    vec3 p = mix(position, gathered, uGather * near);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.6 + 0.4 * sin(uTime * (0.8 + fract(aPhase) * 1.6) + aPhase * 6.2831);
    vBright = mix(1.0, tw, uTwinkle) * (1.0 + uGather * near * 0.8);
    vColor = aColor;
    gl_PointSize = clamp(aSize * uPixelRatio * (uScale / -mv.z), 1.0, 24.0 * uPixelRatio);
  }
`;

/** 성운 구름(카메라를 향하는 판): 여러 겹 노이즈 + 가장자리 흐림 + 가까워지면 옅어짐(카메라가 통과할 때 튀지 않게) */
export const NEBULA_VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const NEBULA_FRAG = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  uniform float uTime;
  uniform float uSeed;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  uniform vec2 uLight;
  uniform float uDark;
  uniform float uNearFade;
  uniform vec3 uTint;
  uniform float uTintAmt;
  // sin 없는 해시: 모바일(중간 정밀도)에서도 무늬가 깨지지 않는다
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }
  void main() {
    vec2 c = vUv - 0.5;
    float t = uTime * 0.01;
    vec2 p = vUv * 3.4 + vec2(uSeed * 3.1, uSeed * 1.7);
    // 소용돌이치는 구름: 무늬로 좌표를 비틀어(도메인 워프) 뭉게뭉게한 덩어리와 가는 결을 만든다
    vec2 q = vec2(fbm(p + vec2(t, 0.0)), fbm(p + vec2(5.2, 1.3) - vec2(0.0, t * 0.8)));
    vec2 w = p + 1.9 * q;
    float n = fbm(w);
    // 빛 쪽으로 조금 옮긴 곳의 밀도: 빛 쪽으로 갈수록 옅어지는 면(구름의 빛 받는 가장자리)이 밝다
    float nl = fbm(w + uLight * 0.18);
    float lit = clamp((n - nl) * 9.0, 0.0, 1.0);
    float shape = 1.0 - smoothstep(0.14, 0.5, length(c * vec2(1.0, 1.2)));
    // 뭉게구름 덩어리(진한 몸통) + 그 둘레의 옅은 안개
    float dens = smoothstep(0.42, 0.7, n + (q.x - 0.5) * 0.2) * shape;
    float haze = smoothstep(0.25, 0.6, n) * shape * 0.28;
    float near = smoothstep(uNearFade * 0.2, uNearFade, vDepth);
    float a = (dens + haze * (1.0 - dens)) * uOpacity * near;
    if (uDark > 0.5) {
      // 어두운 먼지 구름: 뒤의 별·성운을 가리고, 빛 받는 가장자리만 라벤더빛으로 빛난다
      vec3 col = mix(uColorA * 0.45, uColorB * 1.25, lit * lit) * mix(vec3(1.0), uTint * 1.3, uTintAmt);
      gl_FragColor = vec4(col, a * 0.82);
      return;
    }
    // 빛나는 성운: 속은 진한 바탕색, 빛 받는 가장자리는 밝은 색·흰빛, 가는 결(능선)이 반짝인다
    float ridge = 1.0 - abs(q.y * 2.0 - 1.0);
    vec3 col = uColorA * (0.45 + 0.7 * n);
    col = mix(col, uColorB * 1.35, smoothstep(0.05, 0.75, lit));
    col += vec3(1.0, 0.86, 1.0) * pow(lit, 2.5) * 0.45 * dens;
    col += uColorB * pow(ridge, 8.0) * 0.35;
    // 단계마다 바뀌는 하늘 색조 (단계 화면이 아니면 세기 0)
    col *= mix(vec3(1.0), uTint * 1.3, uTintAmt);
    gl_FragColor = vec4(col * a, a);
  }
`;

/** 별똥별 반짝이 입자: 태어날 때 크고 밝다가 줄어들며 흰색 → 라벤더 → 파랑으로 옅어진다 */
export const SPARKLE_VERT = /* glsl */ `
  attribute float aLife;
  attribute float aSeed;
  uniform float uPixelRatio;
  uniform float uTime;
  varying float vLife;
  varying float vTw;
  varying float vSeed;
  void main() {
    vLife = aLife;
    vSeed = aSeed;
    vTw = 0.65 + 0.35 * sin(uTime * 18.0 + aSeed * 40.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = (0.6 + 2.6 * aLife) * (0.6 + fract(aSeed * 7.3));
    gl_PointSize = clamp(size * uPixelRatio * (22.0 / -mv.z), 0.0, 22.0 * uPixelRatio) * step(0.001, aLife);
  }
`;

export const SPARKLE_FRAG = /* glsl */ `
  varying float vLife;
  varying float vTw;
  varying float vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = 1.0 - smoothstep(0.0, 0.5, d);
    a = a * a * vLife * vTw;
    // 입자마다 색이 다르다: 라벤더·청록·분홍·금빛 (갓 태어났을 때는 흰빛)
    float h = fract(vSeed * 7.31);
    vec3 hue = vec3(0.8, 0.75, 1.0);
    if (h < 0.25) hue = vec3(0.55, 0.95, 1.0);
    else if (h < 0.45) hue = vec3(1.0, 0.6, 0.88);
    else if (h < 0.6) hue = vec3(1.0, 0.86, 0.55);
    vec3 col = mix(hue * 0.75, hue, smoothstep(0.2, 0.6, vLife));
    col = mix(col, vec3(1.0), smoothstep(0.75, 1.0, vLife));
    gl_FragColor = vec4(col * a, a);
  }
`;

/** 별똥별 꼬리(카메라를 향하는 띠): 머리 쪽은 희고 밝게, 끝으로 갈수록 라벤더·보라로 옅어진다 */
export const TRAIL_VERT = /* glsl */ `
  attribute float aAlong;
  attribute float aAcross;
  varying float vAlong;
  varying float vAcross;
  void main() {
    vAlong = aAlong;
    vAcross = aAcross;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const TRAIL_FRAG = /* glsl */ `
  varying float vAlong;
  varying float vAcross;
  uniform float uBrightness;
  uniform vec3 uHead;
  uniform vec3 uMid;
  uniform vec3 uTail;
  uniform float uTime;
  uniform float uFlow;
  void main() {
    // vAlong: 0 = 머리, 1 = 꼬리 끝 / vAcross: -1~1 (띠의 폭 방향)
    float fade = pow(1.0 - vAlong, 1.7);
    float edge = 1.0 - smoothstep(0.0, 1.0, abs(vAcross));
    vec3 col = mix(uHead, uMid, smoothstep(0.0, 0.25, vAlong));
    col = mix(col, uTail, smoothstep(0.25, 1.0, vAlong));
    // 꼬리를 따라 흘러가는 빛의 물결 (uFlow가 0이면 없음)
    float flow = 1.0 + uFlow * (0.45 * sin(vAlong * 38.0 - uTime * 14.0) + 0.25 * sin(vAlong * 91.0 - uTime * 23.0 + vAcross * 2.0));
    float a = fade * edge * uBrightness * flow;
    gl_FragColor = vec4(col * a, a);
  }
`;

/**
 * 시차 별층: 카메라 둘레의 정육면체(한 변 uBox) 안에 별을 깔고, 카메라가 움직이면 반대편에서 다시 나타나게 감는다.
 * 별은 세계에 고정돼 있어 가까운 별은 빠르게, 먼 별은 느리게 지나간다 (실제 원근 시차). 카메라 바로 앞(uNear)과
 * 상자 가장자리에서는 옅어져 감기는 순간이 보이지 않는다. cameraPosition은 three가 넣어 주는 기본 uniform이다.
 */
export const PARALLAX_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScale;
  uniform float uTwinkle;
  uniform float uBox;
  uniform float uNear;
  uniform float uMaxSize;
  varying vec3 vColor;
  varying float vBright;
  void main() {
    vec3 rel = mod(position - cameraPosition + 0.5 * uBox, uBox) - 0.5 * uBox;
    float d = length(rel);
    float fade = smoothstep(uNear, uNear * 2.5, d) * (1.0 - smoothstep(0.3 * uBox, 0.5 * uBox, d));
    vec4 mv = viewMatrix * vec4(cameraPosition + rel, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.6 + 0.4 * sin(uTime * (0.8 + fract(aPhase) * 1.6) + aPhase * 6.2831);
    vBright = mix(1.0, tw, uTwinkle) * fade;
    vColor = aColor;
    gl_PointSize = clamp(aSize * uPixelRatio * (uScale / max(-mv.z, 0.1)), 0.0, uMaxSize * uPixelRatio) * step(0.002, fade);
  }
`;

/** 초점이 맞지 않은 가까운 빛 알갱이(보케): 가장자리가 살짝 밝은 둥근 원 */
export const BOKEH_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vBright;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disc = 1.0 - smoothstep(0.36, 0.5, d);
    float ring = smoothstep(0.24, 0.42, d) * disc;
    float a = (0.22 * disc + 0.3 * ring) * vBright;
    gl_FragColor = vec4(vColor * a, a);
  }
`;

/** 나선 은하 판(원반 평면): 위치만 넘긴다 */
export const GALAXY_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * 나선 은하(그림 대신 계산으로 그림): 로그 나선 팔 + 팔 사이 어두운 먼지띠 + 덩어리진 별 구름 + 분홍빛 흰 중심.
 * 팔 색은 안쪽(uInner) → 바깥(uOuter)으로 바뀌고, 팔 속에 작은 반짝임이 박혀 있다. 원반 회전은 판을 담은 묶음이 돈다.
 */
export const GALAXY_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uArms;
  uniform float uTwist;
  uniform float uSeed;
  uniform float uOpacity;
  uniform vec3 uInner;
  uniform vec3 uOuter;
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }
  void main() {
    vec2 c = (vUv - 0.5) * 2.0;
    float r = length(c);
    if (r > 1.0) discard;
    float th = atan(c.y, c.x);
    float phase = uArms * (th - log(r + 0.05) * uTwist);
    float arm = pow(0.5 + 0.5 * cos(phase), 3.0);
    float lane = pow(0.5 + 0.5 * cos(phase - 1.1), 10.0);
    float clump = fbm(c * 5.0 + uSeed);
    float fine = fbm(c * 16.0 + uSeed * 2.0);
    float edge = 1.0 - smoothstep(0.5, 1.0, r);
    float armI = arm * (0.4 + 0.95 * clump) * edge * smoothstep(0.02, 0.2, r);
    float haze = exp(-r * 3.5) * 0.35 * edge;
    float bulge = exp(-r * r * 14.0);
    float core = exp(-r * r * 90.0);
    vec3 armCol = mix(uInner, uOuter, smoothstep(0.1, 0.75, r));
    armCol = mix(armCol, vec3(0.72, 0.52, 1.0), fine * 0.35);
    vec3 col = armCol * armI * (1.0 - 0.75 * lane * smoothstep(0.1, 0.35, r)) * 1.3;
    col += armCol * haze;
    col += vec3(1.0, 0.82, 0.95) * bulge * 0.85 + vec3(1.0) * core * 0.9;
    col += vec3(1.0) * pow(fine, 6.0) * armI * 2.0;
    gl_FragColor = vec4(col * uOpacity, 1.0);
  }
`;

/**
 * 앞에서 날아오는 빛 알갱이(카메라에 붙은 공간): 멀리서 옅게 나타나 다가올수록 커지고 밝아지며, 바로 앞에서 사라진다.
 * 프래그먼트는 STAR_FRAG를 함께 쓴다.
 */
export const ONCOMING_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uPixelRatio;
  uniform float uFar;
  uniform float uIntensity;
  varying vec3 vColor;
  varying float vBright;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float z = -mv.z;
    float fade = (1.0 - smoothstep(uFar * 0.6, uFar, z)) * smoothstep(0.8, 4.0, z);
    vBright = fade * uIntensity;
    vColor = aColor;
    gl_PointSize = clamp(aSize * uPixelRatio * (40.0 / max(z, 0.1)), 0.0, 30.0 * uPixelRatio) * step(0.002, fade);
  }
`;
