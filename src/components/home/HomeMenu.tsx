import Link from "next/link";

/** 아래 세 칸 메뉴 (이모지 + 이름 + 한 줄 설명) */
const MENUS = [
  { href: "/saju", emoji: "📜", label: "사주 풀이", sub: "타고난 기운" },
  { href: "/tarot", emoji: "🃏", label: "타로", sub: "카드의 조언" },
  { href: "/horoscope", emoji: "✨", label: "별자리", sub: "별이 전하는 말" },
] as const;

/**
 * 홈 시트 메뉴: 위에 오늘의 운세 큰 카드(시작 버튼 겸용), 아래에 나머지 세 메뉴.
 * 생년월일이 없으면 큰 카드가 프로필 입력으로 안내한다.
 */
export function HomeMenu({ hasPrimary }: { hasPrimary: boolean }) {
  return (
    <nav aria-label="메뉴" className="flex w-full shrink-0 flex-col gap-2.5 pb-3">
      <Link
        href={hasPrimary ? "/today" : "/me/profile"}
        className="flex items-center gap-3 rounded-[22px] bg-gradient-to-br from-[var(--primary-from)] to-[var(--primary-to)] px-4 py-[clamp(0.6rem,1.8dvh,0.9rem)] text-left text-white shadow-[0_10px_22px_-10px_rgba(90,50,170,0.8)] outline-none transition focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] active:scale-[0.98] active:brightness-95"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-[28px] leading-none" aria-hidden>
          ☀️
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold leading-tight">{hasPrimary ? "오늘의 운세" : "생년월일 입력하기"}</span>
          <span className="mt-0.5 block truncate text-[13px] text-white/80">{hasPrimary ? "별이가 점쳐 둔 오늘 하루 흐름" : "입력하면 오늘의 운세를 볼 수 있어요"}</span>
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-90" aria-hidden>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
      <div className="grid grid-cols-3 gap-2.5">
        {MENUS.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="flex flex-col items-center justify-center gap-1 rounded-[22px] bg-tile px-1 py-[clamp(0.55rem,1.8dvh,0.9rem)] text-center outline-none transition focus-visible:ring-2 focus-visible:ring-accent active:scale-95 active:bg-[#f0e0cd]"
          >
            <span className="text-[30px] leading-none drop-shadow-[0_3px_4px_rgba(90,50,40,0.2)]" aria-hidden>
              {m.emoji}
            </span>
            <span className="mt-0.5 text-[14px] font-bold leading-tight text-ink">{m.label}</span>
            <span className="text-[12px] leading-tight text-ink-2">{m.sub}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
