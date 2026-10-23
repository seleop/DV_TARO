"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorText } from "@/lib/client";
import { BirthForm, type BirthInitial } from "./BirthForm";
import { Button, Card, ErrorBox, H2, inputCls, TopBar } from "./ui";

/** 프로필 설정: 닉네임 + 내 출생 정보(사주·오늘의 운세·별자리 기준) */
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

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title={notice === "welcome" ? "시작하기" : "프로필 설정"} back={notice ? null : "/me"} />
      {notice && (
        <div className="mb-3 rounded-2xl bg-accent/15 px-4 py-3 text-center text-sm leading-relaxed text-accent">
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
      <Card>
        <H2 sub={email}>닉네임</H2>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} className={inputCls} aria-label="닉네임" />
          <Button variant="ghost" onClick={saveName} loading={busy} disabled={!name.trim() || name.trim() === displayName}>
            저장
          </Button>
        </div>
        <div className="mt-2">
          <ErrorBox message={error} />
          {msg && <p className="text-sm text-ok">{msg}</p>}
        </div>
      </Card>

      <h2 className="mb-1 mt-6 px-1 text-[17px] font-semibold">내 출생 정보</h2>
      <p className="mb-1 px-1 text-[13px] text-ink-2">사주·오늘의 운세·별자리 운세에 쓰여요.</p>
      <BirthForm mode="profile" initial={initial} embedded />
    </div>
  );
}
