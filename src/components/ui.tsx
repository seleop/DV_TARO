import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`glass rounded-[28px] p-5 ${className}`}>{children}</section>;
}

export function H2({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-[17px] font-semibold">{children}</h2>
      {sub && <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{sub}</p>}
    </div>
  );
}

type Variant = "primary" | "light" | "ghost" | "danger" | "blue";
const VARIANT: Record<Variant, string> = {
  primary: "btn-primary text-white",
  blue: "bg-blue text-white shadow-[0_8px_24px_-8px_rgba(79,124,240,0.8)]",
  light: "bg-[#ecebf3] text-[#3a3550]",
  ghost: "glass text-ink",
  danger: "border border-bad/40 text-bad bg-bad/5",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  const sz = { sm: "h-9 px-3.5 text-sm rounded-xl", md: "h-12 px-5 text-[15px] rounded-2xl", lg: "h-14 px-6 text-[17px] rounded-[20px]" }[size];
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${sz} ${VARIANT[variant]} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", size = "lg", children, className = "" }: { href: string; variant?: Variant; size?: "md" | "lg"; children: ReactNode; className?: string }) {
  const sz = size === "lg" ? "h-14 text-[17px] rounded-[20px]" : "h-12 text-[15px] rounded-2xl";
  return (
    <Link href={href} className={`inline-flex w-full items-center justify-center gap-2 px-6 font-semibold transition active:scale-[0.98] ${sz} ${VARIANT[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-2/80">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full h-12 rounded-2xl border border-line bg-white px-4 text-base text-ink placeholder:text-ink-2/60 outline-none focus:border-accent disabled:opacity-40 [color-scheme:light]";

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
      {message}
    </p>
  );
}

const STATUS = {
  MATCH: { label: "교차검증 일치", cls: "bg-ok/15 text-ok border-ok/30", desc: "모든 계산 엔진의 필수 항목이 같아요." },
  CONDITIONAL_MATCH: { label: "조건부 일치", cls: "bg-warn/15 text-warn border-warn/30", desc: "설정 차이로 일부는 한 엔진만 비교했지만 핵심 항목은 같아요." },
  MISMATCH: { label: "엔진 간 불일치", cls: "bg-bad/15 text-bad border-bad/30", desc: "일부 기둥이 엔진마다 달라 확정하지 않았어요." },
  UNVERIFIABLE: { label: "검증 불가", cls: "bg-bad/10 text-bad border-bad/30", desc: "응답 실패나 근거 부족으로 일부를 확정하지 못했어요." },
} as const;

export function StatusBadge({ status, withDesc }: { status: keyof typeof STATUS; withDesc?: boolean }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
      {withDesc && <span className="text-center text-xs text-ink-2">{s.desc}</span>}
    </span>
  );
}

export function MockNotice({ provider }: { provider: string }) {
  if (provider !== "mock") return null;
  return (
    <p className="rounded-2xl border border-warn/30 bg-warn/10 px-4 py-2.5 text-xs text-warn">
      AI 키가 설정되지 않아 <b>모의 응답</b>을 보여 주고 있어요. 실제 해석이 아니에요.
    </p>
  );
}

export function Disclaimer({ className = "" }: { className?: string }) {
  return <p className={`text-center text-[11px] text-ink-2/70 ${className}`}>운세는 오락과 자기 성찰을 위한 참고 정보예요. 건강·법률·투자 판단은 전문가와 상의하세요.</p>;
}

/** 레퍼런스의 카테고리 타일 (이모지 + 라벨) */
export function Tile({ emoji, label, href, active, onClick }: { emoji: string; label: string; href?: string; active?: boolean; onClick?: () => void }) {
  const cls = `flex aspect-square flex-col items-center justify-center gap-2 rounded-[22px] text-[13px] font-semibold transition active:scale-95 ${
    active ? "bg-white ring-2 ring-accent" : "bg-tile"
  }`;
  const inner = (
    <>
      <span className="text-[34px] leading-none drop-shadow-[0_3px_4px_rgba(90,50,40,0.2)]" aria-hidden>
        {emoji}
      </span>
      <span>{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/** 화면 하단 고정 버튼 영역 (레퍼런스의 큰 CTA / 두 개의 알약 버튼) */
export function BottomActions({ children, withTabBar }: { children: ReactNode; withTabBar?: boolean }) {
  return (
    <>
      <div className="h-28" aria-hidden />
      <div
        className={`fixed inset-x-0 z-20 mx-auto w-full max-w-[440px] bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/95 to-transparent px-5 pt-6 ${
          withTabBar ? "bottom-[68px] pb-3" : "bottom-0 pb-safe"
        }`}
      >
        {children}
      </div>
    </>
  );
}

/** 상단 앱 바 (뒤로 가기 + 제목) */
export function TopBar({ title, back = "/", right }: { title?: string; back?: string | null; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 -mx-5 flex h-14 shrink-0 items-center bg-[var(--bg)] px-3 [.scene-dark_&]:bg-transparent [.scene-light_&]:bg-transparent">
      {back ? (
        <Link href={back} aria-label="뒤로" className="flex h-10 w-10 items-center justify-center rounded-full text-ink active:bg-black/5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
      ) : (
        <span className="w-10" />
      )}
      <h1 className="flex-1 text-center text-[16px] font-semibold">{title}</h1>
      <span className="flex w-10 justify-end">{right}</span>
    </header>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-sm text-ink-2">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
      {label}
    </div>
  );
}
