"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PRIVACY_CONSENT } from "@/config/privacy";
import { api, errorText } from "@/lib/client";
import { Screen } from "./app/Screen";
import { Button, ErrorBox } from "./ui";

/**
 * 개인정보 고지 재동의 (2026-10-28 버전: 흐름 처리 위탁·국외 이전).
 * 바뀐 점을 먼저 보여 주고, 전체 내용은 카드 안에서만 스크롤한다. 동의하지 않으면 MY에서 로그아웃·계정 삭제를 할 수 있다.
 */
export function ConsentClient({ next, firstTime }: { next: string; firstTime: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  async function agree() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/me/consent", { body: { version: PRIVACY_CONSENT.version } });
      router.replace(next);
      router.refresh();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <ErrorBox message={error} />
          <Button size="lg" className="w-full" onClick={agree} loading={busy}>
            동의하고 계속하기
          </Button>
          {declined ? (
            <p className="text-center text-[13px] text-ink-2">
              동의하지 않으면 서비스를 이용할 수 없어요.{" "}
              <Link href="/me" className="font-semibold text-accent underline underline-offset-4">
                MY에서 로그아웃·계정 삭제
              </Link>
            </p>
          ) : (
            <button type="button" onClick={() => setDeclined(true)} className="mx-auto block min-h-11 text-[13px] text-ink-2 underline underline-offset-4">
              동의하지 않아요
            </button>
          )}
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col pt-6">
        <h1 className="shrink-0 text-[22px] font-extrabold leading-snug">{firstTime ? "개인정보 처리 안내" : "개인정보 처리 안내가 바뀌었어요"}</h1>
        <p className="mt-1 shrink-0 text-sm text-ink-2">계속 쓰려면 아래 내용을 확인하고 동의해 주세요.</p>
        <ul className="mt-4 shrink-0 space-y-1.5 rounded-[20px] bg-tile px-4 py-3 text-[14px] leading-snug">
          {PRIVACY_CONSENT.changes.map((c) => (
            <li key={c} className="flex gap-2">
              <span aria-hidden className="text-accent">
                ✦
              </span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
        {/* 전체 내용: 카드 안에서만 스크롤 (화면 자체는 스크롤하지 않음) */}
        <section aria-label="전체 내용" className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[20px] border border-line px-4 py-3 text-[13px] leading-relaxed text-ink-2">
          <p className="mb-2 font-semibold text-ink">{PRIVACY_CONSENT.title}</p>
          <dl className="space-y-2">
            {PRIVACY_CONSENT.items.map((i) => (
              <div key={i.label}>
                <dt className="font-semibold text-ink">{i.label}</dt>
                <dd>{i.value}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-2 list-disc space-y-0.5 pl-4">
            {PRIVACY_CONSENT.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      </div>
    </Screen>
  );
}
