"use client";

import { useEffect, useRef } from "react";
import { useVisualViewport } from "@/components/auth/useVisualViewport";
import { MascotNameForm } from "@/components/MascotNameForm";
import { api } from "@/lib/client";
import { josa } from "@/lib/josa";
import { DEFAULT_MASCOT_NAME } from "@/lib/mascot-name";

/** 이름을 물을 때 마스코트 말풍선(홈 위쪽)이 하는 말 */
export const ASK_NAME_LINE = "나한테 이름을 지어 줄래요?\n불러 주는 이름이 제일 좋아요!";

/**
 * 홈에서 한 번 묻는 이름 짓기 (2026-10-25 사용자 결정: 이미 가입해 마스코트를 만난 사용자는 홈에 처음 올 때).
 * 질문은 홈 위쪽 마스코트 말풍선이 하고(ASK_NAME_LINE), 여기서는 아래에서 올라오는 어두운 유리 시트에 입력만 둔다.
 * 실제로 보이는 영역(키보드 제외)에 맞춰 키보드가 올라와도 입력칸·버튼이 가려지지 않는다.
 * "그대로"도 기본 이름으로 저장해 다시 묻지 않는다.
 */
export function NamingOverlay({ onDone }: { onDone: (name: string) => void }) {
  const vv = useVisualViewport();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.focus({ preventScroll: true });
  }, []);

  const save = async (name: string) => {
    await api("/api/me", { method: "PATCH", body: { mascotName: name } });
    onDone(name);
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-40 mx-auto flex h-dvh w-full max-w-[440px] flex-col justify-end transition-[height,top] duration-300 ease-out motion-reduce:transition-none"
      style={vv ? { height: vv.height, top: vv.top } : undefined}
    >
      {/* 아래 메뉴는 가리고 위의 마스코트·말풍선은 보이게: 아래로 갈수록 짙어지는 어둠 */}
      <div aria-hidden className="pointer-events-auto absolute inset-0 bg-[linear-gradient(180deg,rgba(6,4,26,0)_35%,rgba(6,4,26,0.55)_62%,rgba(10,7,36,0.96)_100%)]" />
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${DEFAULT_MASCOT_NAME} 이름 짓기`}
        className="pointer-events-auto relative px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] outline-none"
      >
        <div className="glass-night glass-sheet animate-rise rounded-[28px] px-5 pb-5 pt-5 motion-reduce:animate-none">
          <p className="mb-3 px-1 text-[13px] font-semibold text-ink-2">이름 짓기</p>
          <MascotNameForm saveLabel="이걸로 할게요" keepLabel={`${josa(DEFAULT_MASCOT_NAME, "이/가")} 좋아요`} onSave={save} onKeep={() => save(DEFAULT_MASCOT_NAME)} />
        </div>
      </div>
    </div>
  );
}
