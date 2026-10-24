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
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed * 17.0) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }
  void main() {
    vec2 c = vUv - 0.5;
    float t = uTime * 0.012;
    vec2 p = vUv * 3.0 + vec2(uSeed * 3.1, uSeed * 1.7);
    float n = fbm(p + vec2(t, -t * 0.7));
    float m = fbm(p * 1.8 + n * 1.3 - vec2(t * 0.6, t));
    float shape = 1.0 - smoothstep(0.18, 0.5, length(c));
    float density = smoothstep(0.32, 0.82, n * 0.7 + m * 0.5) * shape;
    float near = smoothstep(4.0, 22.0, vDepth);
    float a = density * uOpacity * near;
    vec3 col = mix(uColorA, uColorB, smoothstep(0.3, 0.8, m));
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
  void main() {
    // vAlong: 0 = 머리, 1 = 꼬리 끝 / vAcross: -1~1 (띠의 폭 방향)
    float fade = pow(1.0 - vAlong, 1.7);
    float edge = 1.0 - smoothstep(0.0, 1.0, abs(vAcross));
    vec3 col = mix(uHead, uMid, smoothstep(0.0, 0.25, vAlong));
    col = mix(col, uTail, smoothstep(0.25, 1.0, vAlong));
    float a = fade * edge * uBrightness;
    gl_FragColor = vec4(col * a, a);
  }
`;
