import Link from "next/link";

/**
 * 장면 왼쪽 위에 떠 있는 동그란 홈 버튼 (하단 탭바를 없앤 뒤 사주·타로·별자리·MY에서 홈으로 돌아가는 길, 2026-10-24 사용자 결정).
 * 장면 안(Screen scene)에 넣으면 장면 맨 위에 겹쳐 떠서 레이아웃 높이를 차지하지 않는다. floating=false 면 줄 안에 놓인다.
 */
export function HomeButton({ floating = true, className = "" }: { floating?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      aria-label="홈으로"
      // 밤 장면·밤 바탕 위에서는 어두운 유리 버튼 (흰 버튼이 장면에서 튀지 않게, 2026-10-28)
      className={`z-20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/75 text-[#4a2f75] shadow-[0_4px_12px_-4px_rgba(60,30,80,0.45)] outline-none backdrop-blur-sm transition focus-visible:ring-2 focus-visible:ring-accent active:scale-90 [.scene-dark_&]:bg-[rgba(20,12,56,0.42)] [.scene-dark_&]:text-white [.scene-dark_&]:shadow-none [.scene-dark_&]:ring-1 [.scene-dark_&]:ring-white/25 [.glass-night_&]:bg-[rgba(20,12,56,0.42)] [.glass-night_&]:text-white [.glass-night_&]:shadow-none [.glass-night_&]:ring-1 [.glass-night_&]:ring-white/25 ${
        floating ? "absolute left-0 top-2" : ""
      } ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z" />
      </svg>
    </Link>
  );
}

/** 홈 장면 오른쪽 위의 MY(기록·프로필) 버튼 */
export function MyButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/me"
      aria-label="MY (기록·프로필)"
      className={`absolute right-0 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/75 text-[#4a2f75] shadow-[0_4px_12px_-4px_rgba(60,30,80,0.45)] outline-none backdrop-blur-sm transition focus-visible:ring-2 focus-visible:ring-accent active:scale-90 [.scene-dark_&]:bg-[rgba(20,12,56,0.42)] [.scene-dark_&]:text-white [.scene-dark_&]:shadow-none [.scene-dark_&]:ring-1 [.scene-dark_&]:ring-white/25 [.glass-night_&]:bg-[rgba(20,12,56,0.42)] [.glass-night_&]:text-white [.glass-night_&]:shadow-none [.glass-night_&]:ring-1 [.glass-night_&]:ring-white/25 ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9a8 8 0 0116 0" />
      </svg>
    </Link>
  );
}
