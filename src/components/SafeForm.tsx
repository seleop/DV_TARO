"use client";

import type { FormEvent, ReactNode } from "react";
import { useHydrated } from "./useHydrated";

/**
 * 하이드레이션 전에는 입력·제출을 막는 폼.
 * method="post"로 두어, 혹시 기본 제출이 일어나도 출생 정보·비밀번호가 URL 쿼리에 실리지 않게 한다.
 */
export function SafeForm({
  onSubmit,
  className,
  children,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  className?: string;
  children: ReactNode;
}) {
  const hydrated = useHydrated();
  return (
    <form method="post" onSubmit={onSubmit} className={className}>
      <fieldset disabled={!hydrated} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
