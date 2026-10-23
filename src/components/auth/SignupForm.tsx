"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PRIVACY_CONSENT } from "@/config/privacy";
import { ApiError, api, errorText } from "@/lib/client";
import { DISPLAY_NAME_MAX, PASSWORD_MAX, splitServerError, validateSignup, type FieldErrors, type SignupField, type SignupValues } from "@/lib/auth/validate";
import { SafeForm } from "../SafeForm";
import { Button, ErrorBox } from "../ui";
import { AuthField, AuthShell, PasswordInput, authInputCls, describedBy, focusNextOnEnter } from "./AuthParts";

const FIELDS: readonly SignupField[] = ["email", "password", "passwordConfirm", "displayName", "inviteCode", "agreePrivacy"];
/** 서버 오류 코드 → 오류를 보여 줄 입력칸 */
const CODE_FIELD: Partial<Record<string, SignupField>> = {
  EMAIL_TAKEN: "email",
  INVALID_EMAIL: "email",
  WEAK_PASSWORD: "password",
  INVALID_INVITE: "inviteCode",
};
const id = (f: SignupField) => `signup-${f}`;

export function SignupForm({ mode }: { mode: "open" | "invite" | "closed" }) {
  if (mode === "closed") {
    return (
      <AuthShell characterSize={180} footer={<LoginLink />}>
        <div className="glass space-y-2 rounded-[28px] p-5 text-center">
          <h2 className="text-[17px] font-semibold">지금은 회원가입을 받지 않아요</h2>
          <p className="text-sm leading-relaxed text-ink-2">새 가입이 필요하면 운영자에게 문의해 주세요. 이미 계정이 있다면 로그인할 수 있어요.</p>
        </div>
      </AuthShell>
    );
  }
  return <OpenSignupForm inviteRequired={mode === "invite"} />;
}

function LoginLink() {
  return (
    <p>
      이미 계정이 있나요?{" "}
      <Link href="/login" className="font-semibold text-accent underline-offset-4 active:underline">
        로그인
      </Link>
    </p>
  );
}

function OpenSignupForm({ inviteRequired }: { inviteRequired: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<SignupValues>({ email: "", password: "", passwordConfirm: "", displayName: "", inviteCode: "", agreePrivacy: false });
  // 칸을 벗어났거나 제출을 시도한 뒤부터 그 칸의 오류를 입력하는 대로 보여 준다
  const [touched, setTouched] = useState<Partial<Record<SignupField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<SignupField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  const live = validateSignup(values, { inviteRequired });
  const err = (f: SignupField) => serverErrors[f] ?? (touched[f] ? live[f] : undefined);
  const touch = (f: SignupField) => () => setTouched((t) => (t[f] ? t : { ...t, [f]: true }));
  const set = (f: Exclude<SignupField, "agreePrivacy">) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [f]: e.target.value }));
    setServerErrors((s) => ({ ...s, [f]: undefined }));
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    setFormError(null);
    setTouched(Object.fromEntries(FIELDS.map((f) => [f, true])));
    const first = FIELDS.find((f) => live[f]);
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      await api("/api/auth/signup", {
        body: {
          email: values.email.trim(),
          password: values.password,
          passwordConfirm: values.passwordConfirm,
          displayName: values.displayName.trim(),
          agreePrivacy: values.agreePrivacy,
          ...(inviteRequired ? { inviteCode: values.inviteCode.trim() } : {}),
        },
      });
      // 가입 직후에는 생년월일 입력(필수 단계)으로 간다
      router.replace("/me/profile?welcome=1");
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError) {
        const s = splitServerError(e, FIELDS, CODE_FIELD);
        setServerErrors(s.fields);
        setFormError(s.rest);
        const firstServer = FIELDS.find((f) => s.fields[f]);
        if (firstServer) document.getElementById(id(firstServer))?.focus();
      } else setFormError(errorText(e));
      setBusy(false);
      submitting.current = false;
    }
  }

  return (
    <AuthShell characterSize={120} footer={<LoginLink />}>
      <SafeForm onSubmit={onSubmit} className="glass space-y-3.5 rounded-[28px] p-5" noValidate>
        <h2 className="text-[17px] font-semibold">회원가입</h2>
        <AuthField id={id("email")} label="이메일" error={err("email")}>
          <input
            {...describedBy(id("email"), err("email"))}
            name="email"
            type="email"
            value={values.email}
            onChange={set("email")}
            onBlur={touch("email")}
            onKeyDown={focusNextOnEnter(id("password"))}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            className={authInputCls(err("email"))}
          />
        </AuthField>
        <AuthField id={id("password")} label="비밀번호" hint={`8자 이상 ${PASSWORD_MAX}자 이하`} error={err("password")}>
          <PasswordInput
            {...describedBy(id("password"), err("password"), true)}
            name="password"
            value={values.password}
            onChange={set("password")}
            onBlur={touch("password")}
            onKeyDown={focusNextOnEnter(id("passwordConfirm"))}
            autoComplete="new-password"
            enterKeyHint="next"
            error={err("password")}
          />
        </AuthField>
        <AuthField
          id={id("passwordConfirm")}
          label="비밀번호 확인"
          hint={values.passwordConfirm && values.password === values.passwordConfirm ? <span className="text-ok">비밀번호가 같아요.</span> : undefined}
          error={err("passwordConfirm")}
        >
          <PasswordInput
            {...describedBy(id("passwordConfirm"), err("passwordConfirm"), Boolean(values.passwordConfirm))}
            name="passwordConfirm"
            value={values.passwordConfirm}
            onChange={set("passwordConfirm")}
            onBlur={touch("passwordConfirm")}
            onKeyDown={focusNextOnEnter(id("displayName"))}
            autoComplete="new-password"
            enterKeyHint="next"
            error={err("passwordConfirm")}
          />
        </AuthField>
        <AuthField id={id("displayName")} label="닉네임" hint="화면에 “○○님”으로 보여요. 나중에 프로필에서 바꿀 수 있어요." error={err("displayName")}>
          <input
            {...describedBy(id("displayName"), err("displayName"), true)}
            name="displayName"
            value={values.displayName}
            onChange={set("displayName")}
            onBlur={touch("displayName")}
            onKeyDown={inviteRequired ? focusNextOnEnter(id("inviteCode")) : focusNextOnEnter(id("agreePrivacy"))}
            maxLength={DISPLAY_NAME_MAX + 10}
            autoComplete="nickname"
            enterKeyHint="next"
            className={authInputCls(err("displayName"))}
          />
        </AuthField>
        {inviteRequired && (
          <AuthField id={id("inviteCode")} label="초대 코드" hint="운영자에게 받은 코드를 입력하세요." error={err("inviteCode")}>
            <input
              {...describedBy(id("inviteCode"), err("inviteCode"), true)}
              name="inviteCode"
              value={values.inviteCode}
              onChange={set("inviteCode")}
              onBlur={touch("inviteCode")}
              onKeyDown={focusNextOnEnter(id("agreePrivacy"))}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              className={`${authInputCls(err("inviteCode"))} uppercase tracking-widest`}
            />
          </AuthField>
        )}

        <PrivacyConsent
          checked={values.agreePrivacy}
          error={err("agreePrivacy")}
          onChange={(checked) => {
            setValues((v) => ({ ...v, agreePrivacy: checked }));
            setServerErrors((s) => ({ ...s, agreePrivacy: undefined }));
            touch("agreePrivacy")();
          }}
        />

        <ErrorBox message={formError} />
        <Button type="submit" size="lg" loading={busy} className="w-full">
          가입하고 시작하기
        </Button>
      </SafeForm>
    </AuthShell>
  );
}

function PrivacyConsent({ checked, error, onChange }: { checked: boolean; error?: string; onChange: (checked: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const cid = id("agreePrivacy");
  return (
    <div className={`rounded-2xl border px-3 py-1 ${error ? "border-bad/60" : "border-line"}`}>
      <div className="flex items-center gap-1">
        <label htmlFor={cid} className="flex min-h-11 flex-1 items-center gap-3 text-[14px]">
          <input
            {...describedBy(cid, error)}
            type="checkbox"
            name="agreePrivacy"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-accent"
          />
          <span>{PRIVACY_CONSENT.title}</span>
        </label>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={`${cid}-detail`}
          className="min-h-11 shrink-0 px-2 text-[13px] text-ink-2 underline underline-offset-4"
        >
          {open ? "접기" : "보기"}
        </button>
      </div>
      {open && (
        <div id={`${cid}-detail`} className="mb-2 space-y-2 rounded-xl bg-white/5 p-3 text-[13px] leading-relaxed text-ink-2">
          <dl className="space-y-1.5">
            {PRIVACY_CONSENT.items.map((i) => (
              <div key={i.label}>
                <dt className="font-semibold text-ink">{i.label}</dt>
                <dd>{i.value}</dd>
              </div>
            ))}
          </dl>
          <ul className="list-disc space-y-0.5 pl-4">
            {PRIVACY_CONSENT.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <p id={`${cid}-msg`} className="mb-2 text-[13px] text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
