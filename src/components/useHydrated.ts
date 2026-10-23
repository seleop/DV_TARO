"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * 클라이언트 하이드레이션 완료 여부.
 * 하이드레이션 전에 폼이 제출되면 브라우저 기본 동작(GET)으로 입력값이 URL에 실릴 수 있으므로
 * 그 전까지 제출 버튼을 비활성화하는 데 쓴다.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
