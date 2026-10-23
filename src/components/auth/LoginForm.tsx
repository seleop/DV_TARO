"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ApiError, api, errorText } from "@/lib/client";
import { splitServerError, validateLogin, type FieldErrors, type LoginValues } from "@/lib/auth/validate";
import { SafeForm } from "../SafeForm";
import { Button, ErrorBox } from "../ui";
import { AuthField, AuthShell, PasswordInput, authInputCls, describedBy, focusNextOnEnter } from "./AuthParts";

type F = keyof LoginValues;
const FIELDS: readonly F[] = ["email", "password"];

export function LoginForm({ next, canSignup }: { next: string; canSignup: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<LoginValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors<F>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  const set = (f: F) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [f]: e.target.value }));
    setErrors((er) => ({ ...er, [f]: undefined }));
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    setFormError(null);
    const found = validateLogin(values);
    setErrors(found);
    const first = FIELDS.find((f) => found[f]);
    if (first) {
      document.getElementById(`login-${first}`)?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      await api("/api/auth/login", { body: { email: values.email.trim(), password: values.password } });
      router.replace(next);
      router.refresh();
      // 이동이 끝날 때까지 버튼을 잠근다 (중복 제출 방지)
    } catch (err) {
      if (err instanceof ApiError) {
        const s = splitServerError(err, FIELDS);
        setErrors(s.fields);
        setFormError(s.rest);
      } else setFormError(errorText(err));
      setBusy(false);
      submitting.current = false;
    }
  }

  return (
    <AuthShell
      characterSize={200}
      footer={
        <>
          {canSignup && (
            <p>
              아직 계정이 없나요?{" "}
              <Link href="/signup" className="font-semibold text-accent underline-offset-4 active:underline">
                회원가입
              </Link>
            </p>
          )}
          <p className="text-xs text-ink-2/80">비밀번호를 잊었다면 운영자에게 문의해 주세요.</p>
        </>
      }
    >
      <SafeForm onSubmit={onSubmit} className="glass space-y-3.5 rounded-[28px] p-5" noValidate>
        <h2 className="text-[17px] font-semibold">로그인</h2>
        <AuthField id="login-email" label="이메일" error={errors.email}>
          <input
            {...describedBy("login-email", errors.email)}
            name="email"
            type="email"
            value={values.email}
            onChange={set("email")}
            onKeyDown={focusNextOnEnter("login-password")}
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            className={authInputCls(errors.email)}
          />
        </AuthField>
        <AuthField id="login-password" label="비밀번호" error={errors.password}>
          <PasswordInput
            {...describedBy("login-password", errors.password)}
            name="password"
            value={values.password}
            onChange={set("password")}
            autoComplete="current-password"
            enterKeyHint="go"
            error={errors.password}
          />
        </AuthField>
        <ErrorBox message={formError} />
        <Button type="submit" size="lg" loading={busy} className="w-full">
          로그인
        </Button>
      </SafeForm>
    </AuthShell>
  );
}
