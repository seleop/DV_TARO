import type { SceneKind } from "@/lib/scene";

/**
 * 장면 일러스트 (별이네 점집). 장면 영역을 꽉 채우고 바닥(아래쪽) 기준으로 맞춘다(xMidYMax slice):
 * 화면이 짧으면 하늘 위쪽이 잘리고, 땅·천막 아래쪽은 항상 보인다.
 * 움직이는 효과는 넣지 않는다 (모바일 성능). 캐릭터가 서는 자리는 아래 가운데 (y≈430).
 *  - entrance: 해질녘 천막 입구 (홈·오늘의 운세)
 *  - inside: 천막 안 아늑한 점집 (사주·타로)
 *  - garden: 별빛 정원 천막 (별자리·로그인)
 */
export function SceneArt({ kind, className = "" }: { kind: Extract<SceneKind, "entrance" | "inside" | "garden">; className?: string }) {
  return (
    <svg viewBox="0 0 375 520" preserveAspectRatio="xMidYMax slice" className={`pointer-events-none ${className}`} aria-hidden>
      {kind === "entrance" ? <Entrance /> : kind === "inside" ? <Inside /> : <Garden />}
    </svg>
  );
}

function Entrance() {
  return (
    <>
      <defs>
        <linearGradient id="sa-a-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc6a6" />
          <stop offset=".55" stopColor="#f6b5c4" />
          <stop offset="1" stopColor="#cdb7ef" />
        </linearGradient>
        <radialGradient id="sa-a-door" cx=".5" cy=".75" r=".8">
          <stop offset="0" stopColor="#ffe2a0" />
          <stop offset=".6" stopColor="#ffb46a" />
          <stop offset="1" stopColor="#d97a4a" />
        </radialGradient>
        <pattern id="sa-a-stripe" width="44" height="10" patternUnits="userSpaceOnUse">
          <rect width="22" height="10" fill="#7a5ac6" />
          <rect x="22" width="22" height="10" fill="#fff0dc" />
        </pattern>
      </defs>
      <rect width="375" height="520" fill="url(#sa-a-sky)" />
      <circle cx="306" cy="150" r="34" fill="#fff1c9" opacity=".9" />
      <g fill="#fff" opacity=".75">
        <ellipse cx="70" cy="120" rx="38" ry="12" />
        <ellipse cx="96" cy="112" rx="24" ry="12" />
        <ellipse cx="250" cy="206" rx="30" ry="9" />
      </g>
      <path d="M0 340 Q90 290 190 326 T375 310 V520 H0Z" fill="#b8d6a3" />
      <path d="M0 370 Q120 340 230 362 T375 356 V520 H0Z" fill="#a3cb8f" />
      {/* 천막 */}
      <path d="M50 404 L76 236 Q187 140 299 236 L325 404Z" fill="url(#sa-a-stripe)" />
      <path d="M76 236 Q187 140 299 236" fill="none" stroke="#5b3f9e" strokeWidth="5" />
      <path d="M187 140 V116" stroke="#5b3f9e" strokeWidth="4" />
      <path d="M187 104 l8 12 h-16z" fill="#f2c14e" />
      <path d="M76 236 q11.15 18 22.3 0 q11.15 18 22.3 0 q11.15 18 22.3 0 q11.15 18 22.3 0 q11.15 18 22.3 0 q11.15 18 22.3 0 q11.15 18 22.3 0 q11.15 18 22.3 0 q11.15 18 22.3 0 q11.15 18 22.3 0z" fill="#f2c14e" />
      <path d="M128 404 V300 Q187 246 246 300 V404Z" fill="url(#sa-a-door)" />
      <path d="M128 300 Q108 344 118 404 L142 404 Q130 344 152 272Z" fill="#fff0dc" stroke="#e4c9a8" strokeWidth="2" />
      <path d="M246 300 Q266 344 256 404 L232 404 Q244 344 222 272Z" fill="#fff0dc" stroke="#e4c9a8" strokeWidth="2" />
      {/* 깃발 줄 */}
      <path d="M0 176 Q90 212 187 176 T375 176" fill="none" stroke="#8a6a4a" strokeWidth="1.5" />
      <path d="M22 183 l8 16 l8 -13z M262 197 l8 16 l8 -15z" fill="#f08a6b" />
      <path d="M58 193 l8 16 l8 -14z M338 183 l8 16 l8 -13z" fill="#f2c14e" />
      <path d="M96 198 l8 16 l8 -15z M300 192 l8 16 l8 -14z" fill="#8fd3b0" />
      {/* 마당 */}
      <path d="M0 404 H375 V520 H0Z" fill="#f0d4ae" />
      <path d="M0 404 H375" stroke="#e2bf93" strokeWidth="3" />
      {/* 수정구슬 탁자 · 화분 */}
      <rect x="22" y="380" width="58" height="34" rx="6" fill="#8e5fbe" />
      <rect x="18" y="374" width="66" height="10" rx="5" fill="#a27bd0" />
      <circle cx="51" cy="356" r="18" fill="#cfe6ff" opacity=".9" />
      <circle cx="45" cy="350" r="5" fill="#fff" />
      <path d="M302 414 h40 l-6 -28 h-28z" fill="#e58a5a" />
      <g fill="#6fae5a">
        <ellipse cx="322" cy="372" rx="10" ry="22" />
        <ellipse cx="308" cy="378" rx="8" ry="16" transform="rotate(-25 308 378)" />
        <ellipse cx="336" cy="378" rx="8" ry="16" transform="rotate(25 336 378)" />
      </g>
    </>
  );
}

function Inside() {
  return (
    <>
      <defs>
        <linearGradient id="sa-b-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5c418f" />
          <stop offset="1" stopColor="#7a58b0" />
        </linearGradient>
        <radialGradient id="sa-b-glow" cx=".5" cy=".6" r=".55">
          <stop offset="0" stopColor="#ffd99a" stopOpacity=".5" />
          <stop offset="1" stopColor="#ffd99a" stopOpacity="0" />
        </radialGradient>
        <pattern id="sa-b-stars" width="46" height="46" patternUnits="userSpaceOnUse">
          <path d="M10 8 l2 5 5 .5 -4 3 1.5 5 -4.5 -3 -4.5 3 1.5 -5 -4 -3 5 -.5z" fill="#f2c14e" opacity=".5" />
          <circle cx="34" cy="32" r="2" fill="#fff" opacity=".45" />
          <path d="M33 12 a6 6 0 1 0 6 8 a5 5 0 1 1 -6 -8z" fill="#ffe7b0" opacity=".4" />
        </pattern>
        <pattern id="sa-b-plank" width="375" height="22" patternUnits="userSpaceOnUse">
          <rect width="375" height="22" fill="#c98b5a" />
          <rect y="20" width="375" height="2" fill="#a96e43" />
        </pattern>
      </defs>
      <rect width="375" height="520" fill="url(#sa-b-wall)" />
      <rect width="375" height="520" fill="url(#sa-b-stars)" />
      <rect width="375" height="520" fill="url(#sa-b-glow)" />
      {/* 천장 휘장 */}
      <path d="M-10 0 H385 V60 Q340 112 290 64 Q240 116 188 64 Q136 116 86 64 Q36 112 -10 60Z" fill="#ffcf9a" />
      <path d="M-10 0 H385 V46 Q340 86 290 50 Q240 90 188 50 Q136 90 86 50 Q36 86 -10 46Z" fill="#f08a6b" />
      <g fill="#f2c14e">
        <circle cx="86" cy="78" r="5" />
        <circle cx="188" cy="80" r="5" />
        <circle cx="290" cy="78" r="5" />
      </g>
      {/* 등불 */}
      {[
        [56, 150],
        [320, 136],
      ].map(([x, y]) => (
        <g key={x}>
          <line x1={x} y1="60" x2={x} y2={y - 14} stroke="#3d2a5c" strokeWidth="1.5" />
          <circle cx={x} cy={y} r="26" fill="#ffd99a" opacity=".35" />
          <rect x={x - 12} y={y - 14} width="24" height="30" rx="10" fill="#ffb46a" />
          <rect x={x - 8} y={y - 18} width="16" height="6" rx="2" fill="#3d2a5c" />
        </g>
      ))}
      {/* 선반 */}
      <rect x="12" y="236" width="80" height="7" rx="3" fill="#a96e43" />
      <rect x="18" y="208" width="12" height="28" rx="2" fill="#f08a6b" />
      <rect x="32" y="212" width="10" height="24" rx="2" fill="#8fd3b0" />
      <rect x="44" y="206" width="13" height="30" rx="2" fill="#f2c14e" />
      <path d="M64 236 v-14 a10 10 0 0 1 20 0 v14z" fill="#cfe6ff" opacity=".85" />
      <rect x="284" y="250" width="80" height="7" rx="3" fill="#a96e43" />
      <circle cx="300" cy="238" r="12" fill="#e58a5a" />
      <path d="M318 250 l9 -26 9 26z" fill="#b9a6e8" />
      <rect x="340" y="226" width="14" height="24" rx="3" fill="#fff0dc" />
      {/* 뒤 탁자와 수정구슬 (캐릭터 뒤) */}
      <path d="M118 334 h138 l-8 70 h-122z" fill="#f08a6b" />
      <path d="M112 326 h150 a6 6 0 0 1 0 12 h-150 a6 6 0 0 1 0 -12z" fill="#ffcf9a" />
      <circle cx="187" cy="298" r="26" fill="#cfe6ff" opacity=".95" />
      <circle cx="187" cy="298" r="36" fill="#d8ecff" opacity=".22" />
      <circle cx="178" cy="288" r="7" fill="#fff" />
      <path d="M170 326 h34 l-5 -8 h-24z" fill="#f2c14e" />
      {/* 바닥 · 방석 */}
      <path d="M0 404 H375 V520 H0Z" fill="url(#sa-b-plank)" />
      <ellipse cx="52" cy="440" rx="36" ry="12" fill="#f2c14e" />
      <ellipse cx="324" cy="444" rx="36" ry="12" fill="#8fd3b0" />
    </>
  );
}

function Garden() {
  return (
    <>
      <defs>
        <linearGradient id="sa-c-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f2c74" />
          <stop offset=".7" stopColor="#6a58b8" />
          <stop offset="1" stopColor="#b59ae0" />
        </linearGradient>
        <radialGradient id="sa-c-door" cx=".5" cy=".8" r=".8">
          <stop offset="0" stopColor="#fff0b0" />
          <stop offset="1" stopColor="#ffb46a" />
        </radialGradient>
      </defs>
      <rect width="375" height="520" fill="url(#sa-c-sky)" />
      <g fill="#fff">
        {[
          [40, 90, 1.6],
          [96, 140, 1.2],
          [150, 80, 1.8],
          [230, 116, 1.3],
          [270, 70, 1.6],
          [340, 170, 1.2],
          [20, 200, 1.2],
          [200, 180, 1],
          [120, 40, 1.4],
          [310, 30, 1.1],
        ].map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
        ))}
      </g>
      <path d="M318 84 a24 24 0 1 0 22 30 a19 19 0 1 1 -22 -30z" fill="#fff3c4" />
      <path d="M0 300 Q100 250 200 290 T375 276 V520 H0Z" fill="#4f9a76" />
      {/* 언덕 위 작은 천막 */}
      <g transform="translate(187 290)">
        <path d="M-62 30 L-46 -46 Q0 -86 46 -46 L62 30Z" fill="#f08a6b" />
        <path d="M-46 -46 Q0 -86 46 -46" fill="none" stroke="#fff0dc" strokeWidth="10" strokeDasharray="14 14" />
        <path d="M-20 30 V-6 Q0 -26 20 -6 V30Z" fill="url(#sa-c-door)" />
        <path d="M0 -86 V-100" stroke="#fff0dc" strokeWidth="3" />
        <path d="M0 -112 l6 10 h-12z" fill="#f2c14e" />
      </g>
      <path d="M-10 270 Q90 254 187 286 Q290 254 385 268" fill="none" stroke="#3d2a5c" strokeWidth="1" />
      <g fill="#ffe7a0">
        {[20, 60, 100, 140, 234, 276, 318, 360].map((x, i) => (
          <circle key={x} cx={x} cy={[271, 266, 266, 274, 274, 266, 264, 268][i]} r="4" />
        ))}
      </g>
      <path d="M0 350 Q120 320 240 340 T375 332 V520 H0Z" fill="#6fbf8a" />
      <path d="M0 404 Q120 390 250 402 T375 396 V520 H0Z" fill="#86cf9a" />
      {/* 꽃 · 반딧불 · 징검돌 */}
      <g>
        <circle cx="40" cy="414" r="6" fill="#ffb3c7" />
        <circle cx="40" cy="414" r="2.5" fill="#f2c14e" />
        <circle cx="336" cy="410" r="6" fill="#fff" />
        <circle cx="336" cy="410" r="2.5" fill="#f2c14e" />
        <circle cx="304" cy="428" r="5" fill="#ffb3c7" />
        <circle cx="72" cy="432" r="5" fill="#fff" />
      </g>
      <g fill="#fff6a8">
        <circle cx="70" cy="330" r="3" />
        <circle cx="300" cy="320" r="3" />
        <circle cx="250" cy="362" r="2.5" />
        <circle cx="120" cy="358" r="2.5" />
      </g>
      <g fill="#d9e6d2">
        <ellipse cx="187" cy="340" rx="16" ry="5" />
        <ellipse cx="180" cy="358" rx="20" ry="6" />
        <ellipse cx="190" cy="380" rx="26" ry="7" />
      </g>
    </>
  );
}
