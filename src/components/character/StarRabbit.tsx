import { useId } from "react";
import { ARM_POSE, propFor, wearsHat, type Expression, type Mood, type Prop, type Scene } from "@/lib/character";

/**
 * 대표 캐릭터 "행운의 별토끼" (몸 전체 + 소품). 캐릭터 이미지를 넣기 전까지 쓰는 기본 캐릭터.
 * 좌표계: 240×240. 머리와 몸이 하나인 2등신 몸통, 짧은 팔·발, 스카프.
 * 움직임은 globals.css 의 char-* 클래스 (팔 흔들기, 귀 쫑긋, 구슬 소용돌이 등). 몸 전체 몸짓은 CharacterStage 가 입힌다.
 */
export function StarRabbit({ expression, gaze, scene, mood, label }: { expression: Expression; gaze: number; scene: Scene; mood?: Mood | null; label: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (k: string) => `sr-${k}-${uid}`;
  const url = (k: string) => `url(#${id(k)})`;
  const prop = propFor(scene, mood);
  const arms = ARM_POSE[prop];
  const hat = wearsHat(prop);

  return (
    <svg viewBox="0 0 240 240" className="h-full w-full overflow-visible" role="img" aria-label={label}>
      <defs>
        <radialGradient id={id("body")} cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#f3eeff" />
          <stop offset="72%" stopColor="#cdbff8" />
          <stop offset="100%" stopColor="#9a85e6" />
        </radialGradient>
        <linearGradient id={id("shade")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="55%" stopColor="#5a3cb0" stopOpacity="0" />
          <stop offset="100%" stopColor="#5a3cb0" stopOpacity="0.28" />
        </linearGradient>
        <radialGradient id={id("foot")} cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffe3ec" />
          <stop offset="100%" stopColor="#e79ab4" />
        </radialGradient>
        <linearGradient id={id("scarf")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#6d5cf0" />
          <stop offset="100%" stopColor="#a26cf5" />
        </linearGradient>
        <linearGradient id={id("purple")} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#8a6cf0" />
          <stop offset="100%" stopColor="#3f2a96" />
        </linearGradient>
        <linearGradient id={id("gold")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffe9a0" />
          <stop offset="100%" stopColor="#e8a93a" />
        </linearGradient>
        <radialGradient id={id("ball")} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#f2f8ff" />
          <stop offset="40%" stopColor="#a99bff" />
          <stop offset="100%" stopColor="#4b2fb8" />
        </radialGradient>
        <radialGradient id={id("glow")}>
          <stop offset="0%" stopColor="#c7b5ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#c7b5ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("canopy")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff9fc4" />
          <stop offset="100%" stopColor="#b77cf2" />
        </linearGradient>
        <filter id={id("blur")} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* 바닥 그림자 */}
      <ellipse cx="120" cy="216" rx="62" ry="9" fill="#120a35" opacity="0.55" filter={url("blur")} />

      <BackProp prop={prop} url={url} />

      {/* 귀 (가끔 쫑긋) */}
      <g className="char-ear char-ear-l">
        <ellipse cx="98" cy="50" rx="15" ry="33" fill={url("body")} transform="rotate(-12 98 50)" />
        <ellipse cx="98" cy="54" rx="7" ry="21" fill="#ffb3c7" opacity="0.75" transform="rotate(-12 98 54)" />
      </g>
      <g className="char-ear char-ear-r">
        <ellipse cx="142" cy="50" rx="15" ry="33" fill={url("body")} transform="rotate(12 142 50)" />
        <ellipse cx="142" cy="54" rx="7" ry="21" fill="#ffb3c7" opacity="0.75" transform="rotate(12 142 54)" />
      </g>

      {/* 몸 (머리와 하나) */}
      <ellipse cx="120" cy="142" rx="58" ry="64" fill={url("body")} />
      <ellipse cx="120" cy="142" rx="58" ry="64" fill={url("shade")} />
      <ellipse cx="96" cy="104" rx="16" ry="9" fill="#fff" opacity="0.55" transform="rotate(-30 96 104)" />
      <ellipse cx="120" cy="178" rx="36" ry="22" fill="#fff" opacity="0.3" />

      {/* 스카프 */}
      <path d="M64 146 Q120 166 176 146 L175 155 Q120 176 65 155 Z" fill={url("scarf")} />
      <path d="M150 158 q10 6 8 20 q-8 -4 -14 -2 z" fill={url("scarf")} />
      <circle cx="148" cy="159" r="5" fill="#ffd66b" />

      {/* 발 */}
      <ellipse cx="100" cy="207" rx="17" ry="9" fill={url("foot")} />
      <ellipse cx="140" cy="207" rx="17" ry="9" fill={url("foot")} />

      {/* 얼굴 (200 좌표계 그림을 옮겨 씀) */}
      <g transform="translate(20 10)">
        <Eyes e={expression} gaze={gaze} />
        <ellipse cx="72" cy="122" rx="8" ry="5" fill="#ffb3c7" opacity={expression === "excited" || expression === "happy" ? 0.95 : 0.75} />
        <ellipse cx="128" cy="122" rx="8" ry="5" fill="#ffb3c7" opacity={expression === "excited" || expression === "happy" ? 0.95 : 0.75} />
        <Mouth e={expression} />
      </g>
      {hat ? <Hat url={url} /> : <path d={starPath(120, 90, 8)} fill={url("gold")} />}

      <FrontProp prop={prop} url={url} />

      {/* 팔: 소품 뒤에서 앞으로 감싸 쥔다 */}
      <Arm x={68} y={142} angle={arms.left} wave={arms.waveLeft} fill={url("body")} />
      <Arm x={172} y={142} angle={arms.right} wave={arms.waveRight} fill={url("body")} />

      <HandProp prop={prop} url={url} />
      <g transform="translate(20 10)">
        <Extras e={expression} />
      </g>
    </svg>
  );
}

type Url = (k: string) => string;

function Arm({ x, y, angle, wave, fill }: { x: number; y: number; angle: number; wave?: boolean; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <g className={wave ? "char-wave" : undefined}>
        <ellipse cx="0" cy="13" rx="10.5" ry="17" fill={fill} />
        <ellipse cx="-3" cy="7" rx="3.5" ry="7" fill="#fff" opacity="0.5" />
      </g>
    </g>
  );
}

function Hat({ url }: { url: Url }) {
  return (
    <g transform="rotate(8 122 86)">
      <ellipse cx="122" cy="86" rx="32" ry="7" fill="#3f2a96" />
      <path d="M99 85 Q110 60 124 36 Q129 30 134 37 Q140 62 145 85 Z" fill={url("purple")} />
      <path d="M100 80 Q122 87 144 80 L145 85 Q122 92 99 85 Z" fill="#ffd66b" />
      <path d={starPath(124, 62, 6)} fill="#ffd66b" className="char-twinkle" />
    </g>
  );
}

/** 몸 뒤에 놓이는 소품 */
function BackProp({ prop, url }: { prop: Prop; url: Url }) {
  if (prop === "umbrella") {
    return (
      <g>
        <line x1="183" y1="52" x2="183" y2="178" stroke="#6b5aa8" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M183 178 q0 10 -8 10 q-7 0 -7 -7" stroke="#6b5aa8" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M135 56 Q183 4 231 56 Q219 49 207 56 Q195 49 183 56 Q171 49 159 56 Q147 49 135 56 Z" fill={url("canopy")} />
        <path d="M183 14 Q170 30 159 56 M183 14 Q196 30 207 56" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" fill="none" />
        <line x1="183" y1="14" x2="183" y2="6" stroke="#6b5aa8" strokeWidth="3" strokeLinecap="round" />
        <g fill="#9fd4ff">
          <path className="char-rain" d="M40 30 q-3 5 0 7 q3 -2 0 -7 z" />
          <path className="char-rain" style={{ animationDelay: "-0.6s" }} d="M62 12 q-3 5 0 7 q3 -2 0 -7 z" />
          <path className="char-rain" style={{ animationDelay: "-1.2s" }} d="M24 64 q-3 5 0 7 q3 -2 0 -7 z" />
        </g>
      </g>
    );
  }
  if (prop === "books") {
    return (
      <g>
        <rect x="16" y="196" width="54" height="15" rx="2.5" fill="#c0566b" />
        <rect x="20" y="198.5" width="48" height="2" fill="#fff" opacity="0.6" />
        <rect x="22" y="183" width="46" height="13" rx="2.5" fill="#4fa3a5" />
        <rect x="25" y="185.5" width="40" height="2" fill="#fff" opacity="0.6" />
        <rect x="17" y="171" width="50" height="12" rx="2.5" fill="#e0b04f" transform="rotate(-4 42 177)" />
        <rect x="186" y="203" width="40" height="9" rx="2" fill="#6d5cf0" transform="rotate(6 206 207)" />
      </g>
    );
  }
  if (prop === "telescope") {
    return (
      <g>
        <g stroke="#8a6a4a" strokeWidth="4" strokeLinecap="round">
          <line x1="198" y1="156" x2="180" y2="214" />
          <line x1="198" y1="156" x2="216" y2="214" />
          <line x1="198" y1="156" x2="199" y2="217" />
        </g>
        <g fill="#ffd66b">
          <path className="char-twinkle" d={sparkle(226, 96, 7)} />
          <path className="char-twinkle" style={{ animationDelay: "-0.8s" }} d={sparkle(208, 76, 5)} />
          <path className="char-twinkle" style={{ animationDelay: "-1.5s" }} d={starPath(232, 120, 5)} />
        </g>
      </g>
    );
  }
  return null;
}

/** 몸 앞(팔 아래)에 놓이는 소품 */
function FrontProp({ prop, url }: { prop: Prop; url: Url }) {
  switch (prop) {
    case "crystal":
      return (
        <g>
          <circle cx="120" cy="170" r="40" fill={url("glow")} className="char-pulse" />
          <path d="M96 213 L144 213 L136 195 L104 195 Z" fill={url("gold")} />
          <ellipse cx="120" cy="195" rx="17" ry="4" fill="#a8742a" />
          <circle cx="120" cy="170" r="28" fill={url("ball")} />
          <g className="char-swirl">
            <path d="M104 172 q16 -18 32 0 q-16 18 -32 0" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.5" fill="none" />
            <path d={sparkle(112, 166, 4)} fill="#fff" />
            <path d={sparkle(130, 178, 3)} fill="#ffd66b" />
          </g>
          <ellipse cx="110" cy="158" rx="8" ry="4.5" fill="#fff" opacity="0.75" transform="rotate(-30 110 158)" />
        </g>
      );
    case "cards":
      return (
        <g className="char-fan">
          {[-22, 0, 22].map((rot, i) => (
            <g key={rot} transform={`rotate(${rot} 120 194)`}>
              <rect x="106" y="146" width="28" height="40" rx="4" fill={i === 1 ? "#f5f0ff" : url("purple")} stroke="#ffd66b" strokeWidth="1.5" />
              <rect x="109.5" y="149.5" width="21" height="33" rx="2.5" fill="none" stroke={i === 1 ? "#b18cff" : "#ffd66b"} strokeOpacity="0.6" />
              {i === 1 ? <path d={starPath(120, 166, 7)} fill="#b18cff" /> : <path d={sparkle(120, 166, 5)} fill="#ffd66b" />}
            </g>
          ))}
        </g>
      );
    case "books":
      return (
        <g>
          <path d="M84 152 L120 158 L156 152 L158 188 L120 194 L82 188 Z" fill="#7a3f9e" />
          <path d="M88 150 Q104 147 120 156 L120 189 Q104 181 88 184 Z" fill="#fffaf0" />
          <path d="M152 150 Q136 147 120 156 L120 189 Q136 181 152 184 Z" fill="#fff6e6" />
          <g stroke="#c9b8a0" strokeWidth="1.6" strokeLinecap="round">
            <path d="M94 158 l18 3 M94 165 l18 3 M94 172 l12 2" />
            <path d="M128 161 l18 -3 M128 168 l18 -3 M128 175 l12 -2" />
          </g>
          <path className="char-page" d="M120 156 Q136 147 152 150 L152 184 Q136 181 120 189 Z" fill="#fffdf6" stroke="#e8dcc6" strokeWidth="0.8" />
        </g>
      );
    case "scroll":
      return (
        <g>
          <rect x="86" y="151" width="68" height="28" fill="#fff4d6" />
          <g stroke="#c9a77a" strokeWidth="1.8" strokeLinecap="round">
            <path d="M94 159 h40 M94 165 h52 M94 171 h30" />
          </g>
          <path d={starPath(140, 172, 5)} fill="#e0566b" />
          <rect x="79" y="147" width="11" height="36" rx="5" fill="#e9cf96" />
          <rect x="150" y="147" width="11" height="36" rx="5" fill="#e9cf96" />
        </g>
      );
    case "tea":
      return (
        <g>
          <g stroke="#fff" strokeOpacity="0.75" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <path className="char-steam" d="M108 156 q-4 -4 0 -8 q4 -4 0 -8" />
            <path className="char-steam" style={{ animationDelay: "-0.9s" }} d="M132 156 q-4 -4 0 -8 q4 -4 0 -8" />
          </g>
          <ellipse cx="120" cy="190" rx="30" ry="5.5" fill="#efe8ff" />
          <path d="M142 166 q13 0 11 11 q-2 8 -13 6" stroke="#fff" strokeWidth="4" fill="none" />
          <path d="M98 160 L142 160 L138 184 Q120 192 102 184 Z" fill="#ffffff" />
          <path d="M100 170 L140 170 L139 176 L101 176 Z" fill="#ffb3c7" />
          <ellipse cx="120" cy="161" rx="21" ry="3.5" fill="#c8875a" />
        </g>
      );
    default:
      return null;
  }
}

/** 손에 쥐어 팔보다 앞이나 위로 나오는 소품 */
function HandProp({ prop, url }: { prop: Prop; url: Url }) {
  switch (prop) {
    case "wand":
      return (
        <g>
          <line x1="53" y1="164" x2="36" y2="116" stroke="#c9a26b" strokeWidth="4" strokeLinecap="round" />
          <path d={starPath(34, 108, 13)} fill={url("gold")} stroke="#e8a93a" strokeWidth="1.5" strokeLinejoin="round" />
          <g fill="#fff3b0">
            <path className="char-twinkle" d={sparkle(14, 92, 5)} />
            <path className="char-twinkle" style={{ animationDelay: "-0.7s" }} d={sparkle(52, 86, 4)} />
            <path className="char-twinkle" style={{ animationDelay: "-1.4s" }} d={sparkle(18, 126, 3.5)} />
          </g>
        </g>
      );
    case "telescope":
      return (
        <g transform="translate(198 150) rotate(-35)">
          <rect x="-31" y="-8" width="62" height="16" rx="4" fill={url("purple")} />
          <rect x="-4" y="-9.5" width="7" height="19" rx="1.5" fill="#ffd66b" />
          <rect x="30" y="-11" width="10" height="22" rx="3" fill={url("gold")} />
          <rect x="-38" y="-5" width="8" height="10" rx="2" fill="#2a2440" />
        </g>
      );
    case "clover":
      return (
        <g className="char-sway-small">
          <path d="M186 118 q3 -16 6 -30" stroke="#3fae6a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <g fill="#5fcf86">
            <circle cx="185" cy="82" r="7" />
            <circle cx="199" cy="82" r="7" />
            <circle cx="192" cy="75" r="7" />
            <circle cx="192" cy="89" r="7" />
          </g>
          <circle cx="192" cy="82" r="3" fill="#ffd66b" />
        </g>
      );
    case "confetti":
      return (
        <g>
          {CONFETTI.map(([x, c, d, shape], i) => (
            <g key={i} transform={`translate(${x} -16)`}>
              {shape ? (
                <rect className="char-confetti" style={{ animationDelay: `-${d}s` }} x="-3" y="-2" width="6" height="4" rx="1" fill={c} />
              ) : (
                <circle className="char-confetti" style={{ animationDelay: `-${d}s` }} r="2.6" fill={c} />
              )}
            </g>
          ))}
        </g>
      );
    default:
      return null;
  }
}

const CONFETTI: Array<[number, string, number, boolean]> = [
  [24, "#ffd66b", 0, true],
  [48, "#ff8fab", 0.7, false],
  [70, "#7fb2ff", 1.4, true],
  [96, "#7ee2a8", 0.35, false],
  [150, "#ffd66b", 1.05, false],
  [172, "#b18cff", 0.2, true],
  [196, "#ff8fab", 1.7, true],
  [218, "#7fb2ff", 0.9, false],
];

// ── 얼굴 (200×200 좌표계, translate(20 10)으로 옮겨 씀) ──
const INK = "#3b2f63";

export function starPath(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
}

export function sparkle(cx: number, cy: number, r: number) {
  return `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`;
}

function OpenEye({ cx, cy, rx = 4, ry = 5.5 }: { cx: number; cy: number; rx?: number; ry?: number }) {
  return (
    <>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={INK} />
      <circle cx={cx + rx * 0.35} cy={cy - ry * 0.4} r={rx * 0.42} fill="#fff" />
    </>
  );
}

function Eyes({ e, gaze }: { e: Expression; gaze: number }) {
  const line = { stroke: INK, strokeWidth: 4, fill: "none", strokeLinecap: "round" as const };
  switch (e) {
    case "blink":
      return (
        <>
          <path d="M78 109 h12" {...line} />
          <path d="M110 109 h12" {...line} />
        </>
      );
    case "calm":
      return (
        <>
          <path d="M76 108 q8 8 16 0" {...line} />
          <path d="M108 108 q8 8 16 0" {...line} />
        </>
      );
    case "happy":
      return (
        <>
          <path d="M77 111 q7 -10 14 0" {...line} />
          <path d="M109 111 q7 -10 14 0" {...line} />
        </>
      );
    case "excited":
      return (
        <>
          <path d={starPath(84, 107, 8)} fill="#ffd66b" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <path d={starPath(116, 107, 8)} fill="#ffd66b" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        </>
      );
    case "sleepy":
      return (
        <>
          <path d="M77 110 q7 3 14 0" {...line} />
          <path d="M109 110 q7 3 14 0" {...line} />
        </>
      );
    case "surprised":
      return (
        <>
          <OpenEye cx={84} cy={106} rx={6} ry={7} />
          <OpenEye cx={116} cy={106} rx={6} ry={7} />
        </>
      );
    case "thinking":
      return (
        <>
          <OpenEye cx={87} cy={104} />
          <OpenEye cx={119} cy={104} />
        </>
      );
    case "worried":
      return (
        <>
          <path d="M77 98 L90 94" {...line} strokeWidth={3} />
          <path d="M110 94 L123 98" {...line} strokeWidth={3} />
          <OpenEye cx={84} cy={108} rx={3.6} ry={4.8} />
          <OpenEye cx={116} cy={108} rx={3.6} ry={4.8} />
        </>
      );
    default:
      return (
        <g style={{ transform: `translateX(${gaze * 4}px)`, transition: "transform 0.35s ease" }}>
          <OpenEye cx={84} cy={108} />
          <OpenEye cx={116} cy={108} />
        </g>
      );
  }
}

function Mouth({ e }: { e: Expression }) {
  const line = { stroke: INK, strokeWidth: 3, fill: "none", strokeLinecap: "round" as const };
  switch (e) {
    case "happy":
    case "excited":
      return (
        <>
          <path d="M92 121 q8 11 16 0 z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="100" cy="126.5" rx="4" ry="2" fill="#ff8fab" />
        </>
      );
    case "surprised":
      return <ellipse cx="100" cy="127" rx="4.5" ry="5.5" fill={INK} />;
    case "sleepy":
      return <ellipse cx="100" cy="128" rx="6" ry="7.5" fill={INK} />;
    case "thinking":
      return <path d="M96 126 q4 -2 8 0" {...line} />;
    case "worried":
      return <path d="M92 127 q2.5 -3 5 0 t5 0 t5 0" {...line} />;
    default:
      return <path d="M95 124 q5 5 10 0" {...line} />;
  }
}

function Extras({ e }: { e: Expression }) {
  switch (e) {
    case "excited":
      return (
        <g fill="#ffd66b">
          <path className="char-twinkle" d={sparkle(30, 70, 9)} />
          <path className="char-twinkle" style={{ animationDelay: "-0.5s" }} d={sparkle(172, 64, 11)} />
        </g>
      );
    case "thinking":
      return (
        <g fill="#fff" opacity="0.9">
          <circle className="char-twinkle" cx="150" cy="58" r="4" />
          <circle className="char-twinkle" style={{ animationDelay: "-0.3s" }} cx="161" cy="47" r="5" />
          <circle className="char-twinkle" style={{ animationDelay: "-0.6s" }} cx="174" cy="34" r="6.5" />
        </g>
      );
    case "worried":
      return <path d="M146 84 q-6 9 0 13 q6 -4 0 -13 z" fill="#9fd4ff" opacity="0.9" />;
    case "surprised":
      return (
        <g stroke="#ffd66b" strokeWidth="3.5" strokeLinecap="round">
          <path d="M152 56 l8 -9" />
          <path d="M160 66 l11 -3" />
          <path d="M48 56 l-8 -9" />
        </g>
      );
    case "sleepy":
      return (
        <g fill="#e3dbff" fontWeight="800" fontFamily="system-ui, sans-serif">
          <text x="150" y="62" fontSize="20">
            z
          </text>
          <text x="166" y="44" fontSize="14">
            z
          </text>
        </g>
      );
    default:
      return null;
  }
}
