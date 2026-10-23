"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "홈", icon: "M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z" },
  { href: "/saju", label: "사주", icon: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.5 2.5 6.5 0 9s-2.5 6.5 0 9" },
  { href: "/tarot", label: "타로", icon: "M7 3h10a1 1 0 011 1v16a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zm5 5l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z" },
  { href: "/horoscope", label: "별자리", icon: "M12 2l2.6 6.3 6.8.6-5.2 4.5 1.6 6.6L12 16.6 6.2 20l1.6-6.6L2.6 8.9l6.8-.6z" },
  { href: "/me", label: "MY", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9a8 8 0 0116 0" },
];

/** 탭 루트 화면에서만 보이는 하단 탭바 (세부 화면은 상단 뒤로 가기 + 하단 CTA 사용). 화면 틀 안에 놓여 본문 높이를 줄인다 */
export function BottomTabBar() {
  const path = usePathname();
  if (!TABS.some((t) => t.href === path)) return null;
  return (
    <>
      <nav className="z-30 w-full shrink-0 border-t border-white/10 bg-[#0c0924]/90 backdrop-blur-xl pb-safe">
        <ul className="grid grid-cols-5">
          {TABS.map((t) => {
            const active = t.href === path;
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-[56px] flex-col items-center justify-center gap-1 text-[11px] ${active ? "text-accent" : "text-ink-2/70"}`}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={t.icon} />
                  </svg>
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
