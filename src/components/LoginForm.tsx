"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BRAND } from "@/config/brand";
import { api, errorText } from "@/lib/client";
import { CharacterStage } from "./Character";
import { SafeForm } from "./SafeForm";
import { Button, ErrorBox, Field, inputCls } from "./ui";

export function LoginForm({ signupMode }: { signupMode: "open" | "invite" | "closed" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(null);
    if (mode === "signup" && f.get("password") !== f.get("passwordConfirm")) {
      setError("비밀번호가 서로 달라요.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        await api("/api/auth/login", { body: { email: f.get("email"), password: f.get("password") } });
        router.replace("/");
      } else {
        await api("/api/auth/signup", {
          body: {
            email: f.get("email"),
            password: f.get("password"),
            passwordConfirm: f.get("passwordConfirm"),
            displayName: f.get("displayName"),
            ...(signupMode === "invite" ? { inviteCode: f.get("inviteCode") } : {}),
          },
        });
        // 가입 직후에는 프로필 설정(생년월일)으로 안내한다
        router.replace("/me/profile?welcome=1");
      }
      router.refresh();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  const canSignup = signupMode !== "closed";
  return (
    <main className="flex flex-1 flex-col px-5 pb-10 pt-12">
      <div className="text-center">
        <p className="text-[17px] text-ink-2">우리끼리 보는 운세</p>
        <h1 className="text-gradient mt-1 text-[38px] font-extrabold">{BRAND.appName}</h1>
      </div>
      <CharacterStage size={mode === "signup" ? 160 : 220} className="my-4" />

      {canSignup && (
        <div className="mb-3 grid grid-cols-2 rounded-2xl bg-white/5 p-1" role="tablist">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`h-10 rounded-xl text-sm font-semibold ${mode === m ? "bg-white text-[#2a2440]" : "text-ink-2"}`}
            >
              {m === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
        </div>
      )}

      <SafeForm onSubmit={onSubmit} className="glass space-y-3.5 rounded-[28px] p-5">
        <Field label="이메일">
          <input name="email" type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" className={inputCls} />
        </Field>
        <Field label="비밀번호" hint={mode === "signup" ? "8자 이상" : undefined}>
          <input
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : 1}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className={inputCls}
          />
        </Field>
        {mode === "signup" && (
          <>
            <Field label="비밀번호 확인">
              <input name="passwordConfirm" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
            </Field>
            <Field label="닉네임" hint="화면에 “○○님”으로 보여요. 나중에 프로필에서 바꿀 수 있어요.">
              <input name="displayName" required maxLength={20} className={inputCls} />
            </Field>
            {signupMode === "invite" && (
              <Field label="초대 코드">
                <input name="inviteCode" required autoComplete="off" className={`${inputCls} uppercase tracking-widest`} />
              </Field>
            )}
          </>
        )}
        <ErrorBox message={error} />
        <Button type="submit" size="lg" loading={busy} className="w-full">
          {mode === "login" ? "로그인" : "가입하고 시작하기"}
        </Button>
      </SafeForm>
      {!canSignup && <p className="mt-4 text-center text-xs text-ink-2">지금은 새 회원가입을 받지 않아요.</p>}
    </main>
  );
}
