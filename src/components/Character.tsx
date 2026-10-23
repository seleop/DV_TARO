import { BRAND, type CharacterPose } from "@/config/brand";

/**
 * 화면 가운데에 놓이는 대표 캐릭터 무대.
 * 캐릭터 이미지는 src/config/brand.ts 에서 지정한다. 지정 전에는 플레이스홀더를 그린다.
 */
export function CharacterStage({
  pose = "default",
  size = 240,
  orbs = true,
  className = "",
}: {
  pose?: CharacterPose;
  size?: number;
  orbs?: boolean;
  className?: string;
}) {
  const src = BRAND.character.images[pose] ?? BRAND.character.images.default;
  const orbCount = 5;
  return (
    <div className={`relative mx-auto flex items-center justify-center ${className}`} style={{ width: size, height: size }} aria-hidden={!src}>
      {/* 바닥 글로우 */}
      <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(177,140,255,0.45),transparent_70%)] blur-2xl animate-glow" />
      {orbs && (
        <>
          {/* 고리 */}
          <div className="absolute inset-[8%] rounded-full border-[6px] border-white/25 shadow-[0_0_30px_rgba(180,160,255,0.35)]" />
          {/* 공전하는 빛 구슬 */}
          <div className="absolute inset-0 animate-orbit">
            {Array.from({ length: orbCount }, (_, i) => {
              const a = (i / orbCount) * Math.PI * 2 - Math.PI / 2;
              const r = size * 0.46;
              return (
                <span
                  key={i}
                  className="absolute h-[11%] w-[11%] rounded-full bg-white shadow-[0_0_18px_6px_rgba(200,170,255,0.75)]"
                  style={{ left: `calc(50% + ${Math.cos(a) * r}px - 5.5%)`, top: `calc(50% + ${Math.sin(a) * r}px - 5.5%)` }}
                />
              );
            })}
          </div>
        </>
      )}
      <div className="relative animate-float" style={{ width: size * 0.62, height: size * 0.62 }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- 사용자가 교체하는 정적 캐릭터 이미지
          <img src={src} alt={BRAND.character.alt} className="h-full w-full object-contain drop-shadow-[0_12px_30px_rgba(120,80,220,0.55)]" />
        ) : (
          <PlaceholderCharacter />
        )}
      </div>
    </div>
  );
}

/** 캐릭터 이미지를 넣기 전까지 쓰는 기본 캐릭터 (별 요정) */
function PlaceholderCharacter() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-[0_14px_30px_rgba(120,80,220,0.6)]" role="img" aria-label="캐릭터 자리">
      <defs>
        <radialGradient id="pc-body" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e3dbff" />
          <stop offset="100%" stopColor="#a996f2" />
        </radialGradient>
        <linearGradient id="pc-cape" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8f9cff" />
          <stop offset="100%" stopColor="#5b5fd6" />
        </linearGradient>
      </defs>
      {/* 귀 */}
      <ellipse cx="70" cy="48" rx="15" ry="30" fill="url(#pc-body)" transform="rotate(-14 70 48)" />
      <ellipse cx="130" cy="48" rx="15" ry="30" fill="url(#pc-body)" transform="rotate(14 130 48)" />
      <ellipse cx="70" cy="50" rx="7" ry="18" fill="#ffb3c7" opacity="0.7" transform="rotate(-14 70 50)" />
      <ellipse cx="130" cy="50" rx="7" ry="18" fill="#ffb3c7" opacity="0.7" transform="rotate(14 130 50)" />
      {/* 망토 */}
      <path d="M40 132 Q100 108 160 132 L172 176 Q100 160 28 176 Z" fill="url(#pc-cape)" opacity="0.95" />
      {/* 몸 */}
      <ellipse cx="100" cy="112" rx="56" ry="58" fill="url(#pc-body)" />
      {/* 눈 (감은 눈) */}
      <path d="M76 108 q8 8 16 0" stroke="#3b2f63" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M108 108 q8 8 16 0" stroke="#3b2f63" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* 볼 */}
      <ellipse cx="72" cy="122" rx="8" ry="5" fill="#ffb3c7" opacity="0.75" />
      <ellipse cx="128" cy="122" rx="8" ry="5" fill="#ffb3c7" opacity="0.75" />
      {/* 입 */}
      <path d="M95 124 q5 5 10 0" stroke="#3b2f63" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* 이마의 별 */}
      <path d="M100 66 l4 9 10 1 -8 6 3 10 -9 -5 -9 5 3 -10 -8 -6 10 -1 z" fill="#ffd66b" />
    </svg>
  );
}
