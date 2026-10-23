"use client";

import { useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { BRAND } from "@/config/brand";
import { CharacterStage } from "../Character";
import { inputCls } from "../ui";

/** 로그인·회원가입 공통 틀: 앱 이름 + 대표 캐릭터 + 카드. 키보드가 올라와도 스크롤로 버튼까지 닿도록 고정 배치를 쓰지 않는다. */
export function AuthShell({ characterSize, children, footer }: { characterSize: number; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="text-center">
        <p className="text-[15px] text-ink-2 min-[360px]:text-[17px]">우리끼리 보는 운세</p>
        <h1 className="text-gradient mt-1 text-[32px] font-extrabold min-[360px]:text-[38px]">{BRAND.appName}</h1>
      </div>
      <CharacterStage size={characterSize} className="my-3 max-[359px]:hidden" />
      <div className="mt-4 min-[360px]:mt-0">{children}</div>
      {footer && <div className="mt-5 space-y-2 text-center text-sm text-ink-2">{footer}</div>}
    </main>
  );
}

/** 입력칸 + 라벨 + 안내/오류. 오류가 있으면 안내 대신 오류를 보여 주고 스크린리더에도 연결한다. */
export function AuthField({ id, label, hint, error, children }: { id: string; label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="mt-1.5 text-[13px] text-bad">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-msg`} className="mt-1 text-xs text-ink-2/80">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** 오류·안내 문구와 입력칸을 잇는 접근성 속성 */
export function describedBy(id: string, error?: string, hasHint = false) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hasHint ? `${id}-msg` : undefined,
  } as const;
}

export const authInputCls = (error?: string) => `${inputCls} ${error ? "border-bad/70 focus:border-bad" : ""}`;

/** 엔터를 누르면 폼을 제출하지 않고 다음 칸으로 이동한다 (모바일 키보드의 "다음" 버튼). */
export function focusNextOnEnter(nextId: string) {
  return (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    document.getElementById(nextId)?.focus();
  };
}

/** 비밀번호 입력: 보기/숨기기 버튼 + Caps Lock 경고 */
export function PasswordInput({ error, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { error?: string }) {
  const [visible, setVisible] = useState(false);
  const [caps, setCaps] = useState(false);
  const checkCaps = (e: KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") setCaps(e.getModifierState("CapsLock"));
  };
  return (
    <>
      <div className="relative">
        <input
          {...props}
          type={visible ? "text" : "password"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={(e) => {
            checkCaps(e);
            props.onKeyDown?.(e);
          }}
          onKeyUp={checkCaps}
          onBlur={(e) => {
            setCaps(false);
            props.onBlur?.(e);
          }}
          className={`${authInputCls(error)} pr-14 ${className ?? ""}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
          aria-pressed={visible}
          aria-controls={props.id}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl text-ink-2 active:text-ink"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {caps && (
        <p className="mt-1 text-xs text-warn" role="status">
          Caps Lock이 켜져 있어요.
        </p>
      )}
    </>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-3.2 4.3M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a10.6 10.6 0 0 0 5.4-1.4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M2 2l20 20" />
    </svg>
  );
}
