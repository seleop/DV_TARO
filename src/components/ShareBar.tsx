"use client";

import { useState, type RefObject } from "react";
import { Button } from "./ui";

/**
 * 결과 화면 하단의 "이미지 저장" / "공유하기" 버튼.
 * - 이미지 저장: 지정한 영역을 PNG로 만들어, 파일 공유를 지원하는 기기(모바일)는 공유 시트로, 그 외에는 다운로드로 저장한다.
 * - 공유하기: Web Share API로 텍스트를 공유하고, 지원하지 않으면 클립보드에 복사한다.
 * 공유 내용에는 생년월일 등 출생 정보를 넣지 않는다.
 */
export function ShareBar({ targetRef, fileName, shareTitle, shareText }: { targetRef: RefObject<HTMLElement | null>; fileName: string; shareTitle: string; shareText: string }) {
  const [busy, setBusy] = useState<"image" | "share" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  async function saveImage() {
    if (!targetRef.current) return;
    setBusy("image");
    try {
      const { toBlob } = await import("html-to-image");
      // 분할 웹폰트를 모두 내려받아 넣으면 매우 느려지므로 폰트 포함은 끈다 (기기 기본 한글 폰트로 저장됨).
      const blob = await Promise.race([
        toBlob(targetRef.current, { pixelRatio: 2, backgroundColor: "#0e0a2a", skipFonts: true }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 15_000)),
      ]);
      if (!blob) throw new Error("empty");
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: shareTitle });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        flash("이미지를 저장했어요");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        console.warn("[ShareBar] 이미지 만들기 실패", e); // 기기별 원인 확인용 (사용자 정보 없음)
        flash("이미지를 만들지 못했어요");
      }
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    setBusy("share");
    try {
      if (navigator.share) await navigator.share({ title: shareTitle, text: shareText });
      else {
        await navigator.clipboard.writeText(`${shareTitle}\n${shareText}`);
        flash("내용을 복사했어요");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") flash("공유하지 못했어요");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative">
      {toast && (
        <p role="status" className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-[#2a2440] shadow-lg">
          {toast}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="light" size="lg" onClick={saveImage} loading={busy === "image"} className="rounded-full">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" />
          </svg>
          이미지 저장
        </Button>
        <Button variant="primary" size="lg" onClick={share} loading={busy === "share"} className="rounded-full">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 16V4m0 0L8 8m4-4l4 4M5 14v5a1 1 0 001 1h12a1 1 0 001-1v-5" />
          </svg>
          공유하기
        </Button>
      </div>
    </div>
  );
}
