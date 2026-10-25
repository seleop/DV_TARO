"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorText } from "@/lib/client";
import { calledAs } from "@/lib/mascot-name";
import { BirthForm, type BirthInitial } from "./BirthForm";
import { useMascotName } from "./MascotName";
import { MascotNameSheet } from "./MascotNameSheet";
import { Button, Card, ErrorBox, inputCls, TopBar } from "./ui";

/** 프로필 설정: 닉네임 · 캐릭터 이름 + 내 출생 정보(사주·오늘의 운세·별자리 기준) */
export function ProfileClient({
  displayName,
  email,
  initial,
  notice,
}: {
  displayName: string;
  email: string;
  initial: BirthInitial | null;
  /** welcome: 가입 직후, required: 생년월일이 없어 다른 화면에서 넘어옴 */
  notice: "welcome" | "required" | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mascot = useMascotName();
  const [naming, setNaming] = useState(false);

  async function saveName() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await api("/api/me", { method: "PATCH", body: { displayName: name } });
      setMsg("닉네임을 바꿨어요.");
      router.refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveMascot(next: string) {
    await api("/api/me", { method: "PATCH", body: { mascotName: next } });
    setNaming(false);
    setError(null);
    setMsg(`이제 ${calledAs(next)} 불러요.`);
    router.refresh();
  }

  return (
    // 스크롤 없이: 머리 + (안내 또는 닉네임·캐릭터 이름) + 출생 정보 단계 입력(남는 높이, 하단 버튼 포함)
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title={notice === "welcome" ? "시작하기" : "프로필 설정"} back={notice ? null : "/me"} />
      {notice && (
        <div className="mb-2 shrink-0 rounded-2xl bg-accent/15 px-4 py-3 text-center text-sm leading-relaxed text-accent">
          {notice === "welcome" ? (
            <>
              <b className="block text-[15px]">{displayName}님, 가입을 환영해요!</b>
              마지막 단계예요. 생년월일을 입력하면 바로 시작할 수 있어요.
            </>
          ) : (
            <>먼저 생년월일을 입력해 주세요. 사주·오늘의 운세·별자리 모두 이 정보를 기준으로 봐요.</>
          )}
        </div>
      )}
      {/* 가입 직후·생년월일 필수 안내 중에는 닉네임 칸을 숨겨 출생 정보 입력에 집중한다 */}
      {!notice && (
      <Card className="shrink-0 p-4!">
        <p className="mb-2 flex items-baseline justify-between gap-2 text-[15px] font-semibold">
          닉네임 <span className="truncate text-xs font-normal text-ink-2">{email}</span>
        </p>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} className={inputCls} aria-label="닉네임" />
          <Button variant="ghost" onClick={saveName} loading={busy} disabled={!name.trim() || name.trim() === displayName}>
            저장
          </Button>
        </div>
        {/* 캐릭터 이름: 한 줄로 보여 주고, 바꾸기는 아래에서 올라오는 시트에서 (화면 높이를 아끼려고) */}
        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
          <span className="min-w-0 flex-1 text-[15px] font-semibold">
            캐릭터 이름 <span className="ml-1 font-bold text-accent">{mascot}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={() => setNaming(true)}>
            이름 바꾸기
          </Button>
        </div>
        {(error || msg) && (
          <div className="mt-2">
            <ErrorBox message={error} />
            {msg && <p className="text-sm text-ok">{msg}</p>}
          </div>
        )}
      </Card>
      )}

      <h2 className="mt-3 shrink-0 px-1 text-[15px] font-semibold">
        내 출생 정보 <span className="text-xs font-normal text-ink-2">사주·오늘의 운세·별자리 기준</span>
      </h2>
      <BirthForm mode="profile" initial={initial} embedded />
      {naming && <MascotNameSheet current={mascot} onSave={saveMascot} onClose={() => setNaming(false)} />}
    </div>
  );
}
