"use client";

import type { FormEvent, ReactNode } from "react";
import { useHydrated } from "./useHydrated";

/**
 * 하이드레이션 전에는 입력·제출을 막는 폼.
 * method="post"로 두어, 혹시 기본 제출이 일어나도 출생 정보·비밀번호가 URL 쿼리에 실리지 않게 한다.
 * noValidate: 브라우저 기본 검증 말풍선 대신 화면에서 직접 칸별 오류를 보여 줄 때 쓴다.
 */
export function SafeForm({
  onSubmit,
  className,
  noValidate,
  children,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  className?: string;
  noValidate?: boolean;
  children: ReactNode;
}) {
  const hydrated = useHydrated();
  return (
    <form method="post" onSubmit={onSubmit} className={className} noValidate={noValidate}>
      <fieldset disabled={!hydrated} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
