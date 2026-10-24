"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { BRAND } from "@/config/brand";
import { PRIVACY_CONSENT } from "@/config/privacy";
import { ApiError, api, errorText } from "@/lib/client";
import { DISPLAY_NAME_MAX, splitServerError, validateLogin, validateSignup, type SignupField, type SignupValues } from "@/lib/auth/validate";
import type { MascotState } from "@/config/mascot-assets";
import { FortuneMascot } from "../FortuneMascot";
import { SceneArt } from "../app/SceneArt";
import { SafeForm } from "../SafeForm";
import { Button, inputCls } from "../ui";
import { SignupCosmos } from "./SignupCosmos";
import { useVisualViewport } from "./useVisualViewport";

type Mode = "choose" | "login" | "signup";
type SignupMode = "open" | "invite" | "closed";

/** 단계별 입력칸 설정과 별이가 건네는 말 */
const STEP: Record<
  SignupField,
  {
    label: string;
    login?: string;
    signup: string;
    type?: "email" | "password" | "text";
    autoComplete?: string;
    inputMode?: "email" | "text";
  }
> = {
  email: { label: "이메일", login: "다시 왔구나! 이메일을 알려줘.", signup: "반가워! 먼저 이메일을 알려줄래?", type: "email", autoComplete: "email", inputMode: "email" },
  password: { label: "비밀번호", login: "비밀번호도 알려줘.", signup: "비밀번호를 정해 줘. 8자 이상이면 돼.", type: "password", autoComplete: "new-password" },
  passwordConfirm: { label: "비밀번호 확인", signup: "같은 비밀번호를 한 번 더!", type: "password", autoComplete: "new-password" },
  displayName: { label: "닉네임", signup: "뭐라고 부르면 될까?", type: "text", autoComplete: "nickname" },
  inviteCode: { label: "초대 코드", signup: "받은 초대 코드를 알려줘.", type: "text", autoComplete: "off" },
  agreePrivacy: { label: "개인정보 동의", signup: "마지막으로 이것만 확인해 줘!" },
};
const LOGIN_STEPS: SignupField[] = ["email", "password"];
const signupSteps = (invite: boolean): SignupField[] =>
  invite ? ["email", "password", "passwordConfirm", "displayName", "inviteCode", "agreePrivacy"] : ["email", "password", "passwordConfirm", "displayName", "agreePrivacy"];
const CODE_FIELD: Partial<Record<string, SignupField>> = { EMAIL_TAKEN: "email", INVALID_EMAIL: "email", WEAK_PASSWORD: "password", INVALID_INVITE: "inviteCode", INVALID_CREDENTIALS: "password" };
const EMPTY: SignupValues = { email: "", password: "", passwordConfirm: "", displayName: "", inviteCode: "", agreePrivacy: false };

/**
 * 진입 화면(로그인·회원가입 두 버튼) → 한 칸씩 순차 입력.
 * - 로그인: 카메라가 별이 얼굴로 줌인
 * - 회원가입: 카메라가 밤하늘로 올라가 우주 유람(SignupCosmos)이 단계마다 다르게 움직이고, 별이 하나씩 이어져 별자리가 된다
 * 화면은 실제로 보이는 영역 크기에 맞춰 스크롤 없이 쓴다. 입력칸은 한 개를 계속 써서 단계가 바뀌어도 키보드가 닫히지 않는다.
 */
export function AuthFlow({ initialMode, next, signupMode }: { initialMode: Mode; next: string; signupMode: SignupMode }) {
  const router = useRouter();
  const vv = useVisualViewport();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<SignupValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  // 별이의 한 번 재생 동작 (끝나면 대기 동작으로 돌아간다). 진입 화면에서는 손을 흔들며 맞이한다
  const [reaction, setReaction] = useState<{ state: MascotState; id: number } | null>(initialMode === "choose" ? { state: "wave", id: 0 } : null);
  const react = (state: MascotState) => setReaction((r) => ({ state, id: (r?.id ?? 0) + 1 }));
  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const prevMode = useRef<Mode>(initialMode);
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);
  const [tapHint, setTapHint] = useState(false);
  const pushed = useRef(false);
  const submitting = useRef(false);

  const canSignup = signupMode !== "closed";
  const steps = mode === "login" ? LOGIN_STEPS : signupSteps(signupMode === "invite");
  const field = steps[Math.min(step, steps.length - 1)];
  const meta = STEP[field];
  const last = step === steps.length - 1;

  // 휴대폰 뒤로 가기로 진입 화면에 돌아온다
  useEffect(() => {
    const onPop = () => {
      pushed.current = false;
      setMode("choose");
      setError(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 입력칸으로 커서를 옮긴다.
  // - 진입 화면에서 막 들어왔으면 줌인·별자리 연출(0.7초)이 끝난 뒤 키보드를 올린다 (연출 도중 화면이 툭 줄지 않게)
  // - 단계만 바뀌면 바로 (같은 입력칸을 계속 쓰므로 이미 열린 키보드는 유지된다)
  // iOS는 터치 직후가 아니면 키보드를 띄우지 않으므로, 커서가 안 들어가면 입력칸을 반짝여 눌러 달라고 안내한다.
  useEffect(() => {
    const from = prevMode.current;
    prevMode.current = mode;
    const el = inputRef.current;
    if (mode === "choose" || field === "agreePrivacy" || !el) return;
    const focus = () => {
      el.focus({ preventScroll: true });
      setTapHint(document.activeElement !== el);
    };
    if (from !== "choose") {
      el.focus({ preventScroll: true });
      return;
    }
    const t = setTimeout(focus, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 720);
    return () => clearTimeout(t);
  }, [mode, field]);

  // 무대 크기를 재서 진입 화면 별이 크기를 정한다 (작은 화면에서 제목·버튼과 겹치지 않게)
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setStage({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function enter(m: Exclude<Mode, "choose">) {
    if (!pushed.current) {
      window.history.pushState({ auth: m }, "");
      pushed.current = true;
    }
    setMode(m);
    react("nod");
    setStep(0);
    setError(null);
    setDone(false);
    setShowPw(false);
  }

  function back() {
    setError(null);
    setShowTerms(false);
    if (step > 0) setStep(step - 1);
    else if (pushed.current) window.history.back();
    else setMode("choose");
  }

  function stepError(f: SignupField): string | undefined {
    if (mode === "login") return f === "email" || f === "password" ? validateLogin(values)[f] : undefined;
    return validateSignup(values, { inviteRequired: signupMode === "invite" })[f];
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    const err = stepError(field);
    if (err) {
      setError(err);
      react("surprised");
      return;
    }
    setError(null);
    if (!last) {
      setShowPw(false);
      setStep(step + 1);
      react("nod");
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      if (mode === "login") {
        await api("/api/auth/login", { body: { email: values.email.trim(), password: values.password } });
        react("happy");
        router.replace(next);
      } else {
        await api("/api/auth/signup", {
          body: {
            email: values.email.trim(),
            password: values.password,
            passwordConfirm: values.passwordConfirm,
            displayName: values.displayName.trim(),
            agreePrivacy: values.agreePrivacy,
            ...(signupMode === "invite" ? { inviteCode: values.inviteCode.trim() } : {}),
          },
        });
        // 별자리가 완성되는 모습을 잠깐 보여 준 뒤 이동한다
        setDone(true);
        await new Promise((r) => setTimeout(r, 1100));
        // 가입 직후에는 생년월일 입력(필수 단계)으로 간다
        router.replace("/me/profile?welcome=1");
      }
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError) {
        const s = splitServerError(e, steps, CODE_FIELD);
        const target = steps.findIndex((f) => s.fields[f]);
        if (target >= 0) {
          setStep(target);
          setError(s.fields[steps[target]] ?? null);
        } else setError(s.rest);
      } else setError(errorText(e));
      react("surprised");
      setBusy(false);
      submitting.current = false;
    }
  }

  const setValue = (v: string) => {
    setValues((cur) => ({ ...cur, [field]: v }));
    if (error) setError(null);
  };
  const checkCaps = (e: KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") setCaps(e.getModifierState("CapsLock"));
  };

  const isPassword = meta.type === "password";
  const prompt = mode === "login" ? (meta.login ?? meta.signup) : meta.signup;
  const boxStyle = vv ? { height: vv.height, top: vv.top } : undefined;
  const ease = "transition-all duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none";

  // 별이 크기(px, 2026-10-24 사용자 선택): 진입 400(작은 화면이면 무대에 맞춰 줄임) · 로그인 약 500.
  // 로그인 크기는 키보드가 올라와 무대가 줄어도 그대로 유지한다(사용자 요청) → 화면 폭만 기준으로 삼는다
  const sw = stage?.w ?? 375;
  const sh = stage?.h ?? 600;
  const chooseSize = Math.min(400, sh * 0.72, sw * 1.1);
  const loginSize = Math.min(500, sw * 1.35);
  // 별이 위치(384px 원본 기준 배율): 진입=가운데, 로그인=다가옴, 가입=아래 구석에서 하늘을 올려다봄
  const mascotPos =
    mode === "choose"
      ? { left: "50%", top: "58%", transform: `translate(-50%,-50%) scale(${chooseSize / 384})` }
      : mode === "login"
        ? { left: "50%", top: "calc(50% + 28px)", transform: `translate(-50%,-50%) scale(${loginSize / 384})` }
        : { left: "18%", top: "84%", transform: "translate(-50%,-50%) scale(0.26)" };

  return (
    // 키보드가 오르내릴 때 높이가 툭 바뀌지 않게 부드럽게 따라간다
    <div className="fixed inset-x-0 top-0 z-10 mx-auto flex h-dvh w-full max-w-[440px] flex-col overflow-hidden transition-[height,top] duration-300 ease-out motion-reduce:transition-none" style={boxStyle}>
      {/* 위: 별빛 정원 장면(뒤로·진행 표시·별이·별자리) / 아래: 크림색 시트(버튼·입력) */}
      <div className="scene-dark relative flex min-h-0 flex-1 flex-col">
      {/* 가입 중에는 정원이 아래로 가라앉고 카메라가 하늘로 올라가 3D 우주가 위쪽을 채운다 */}
      <SceneArt kind="garden" className={`absolute inset-0 h-full w-full ${ease} ${mode === "signup" ? "translate-y-1/4 opacity-0" : ""}`} />
      <SignupCosmos active={mode === "signup"} field={field} total={steps.length} step={step} done={done} />
      {/* 상단: 뒤로 + 진행 표시 */}
      <div className="relative flex h-14 shrink-0 items-center px-3 pt-[env(safe-area-inset-top)]">
        {mode !== "choose" && (
          <button type="button" onClick={back} aria-label="뒤로" className="flex h-11 w-11 items-center justify-center rounded-full text-ink active:bg-white/10">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        {mode === "login" && (
          <div className="ml-auto mr-3 flex gap-1.5" aria-label={`${steps.length}단계 중 ${step + 1}단계`}>
            {steps.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? "w-5 bg-accent" : "w-1.5 bg-white/25"}`} />
            ))}
          </div>
        )}
      </div>

      {/* 무대: 별이 + 하늘 */}
      <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden pb-6">
        <div className={`absolute inset-x-0 top-0 text-center ${ease} ${mode === "choose" ? "translate-y-[6%] opacity-100" : "-translate-y-full opacity-0"}`}>
          <p className="text-[15px] text-ink-2">우리끼리 보는 운세</p>
          <h1 className="text-gradient mt-1 text-[34px] font-extrabold leading-tight">{BRAND.appName}</h1>
        </div>

        <div className={`absolute h-[384px] w-[384px] origin-center ${ease}`} style={mascotPos}>
          {/* 스프라이트 원본(384px) 크기로 그리고 배율로 줄이고 키워 확대해도 덜 흐리게 한다 */}
          <FortuneMascot
            state={done ? "celebrate" : (reaction?.state ?? "idle")}
            playId={reaction?.id ?? 0}
            size={384}
            preload={["wave", "nod", "surprised", "happy", "celebrate"]}
            onAnimationComplete={(st) => {
              if (st !== "celebrate") setReaction((r) => (r?.state === st ? null : r));
            }}
          />
        </div>

        {/* 별이의 말풍선 */}
        {mode !== "choose" && (
          <p
            key={`${mode}-${field}`}
            aria-live="polite"
            className={`absolute animate-[rise_.35s_ease-out] rounded-2xl bg-white px-4 py-2.5 text-[15px] font-semibold text-[#2a2440] shadow-lg motion-reduce:animate-none ${
              mode === "login" ? "left-1/2 top-3 -translate-x-1/2 whitespace-nowrap" : "bottom-[12%] left-[34%] right-4"
            }`}
          >
            {done ? "별자리가 완성됐어!" : prompt}
          </p>
        )}

        {/* 동의 내용 (무대 위에 겹쳐 보여 준다) */}
        {showTerms && mode === "signup" && field === "agreePrivacy" && (
          <div id="auth-terms" className="absolute inset-3 overflow-y-auto rounded-2xl bg-[#140f33]/95 p-4 text-[13px] leading-relaxed text-ink-2 backdrop-blur">
            <p className="mb-2 font-semibold text-ink">{PRIVACY_CONSENT.title}</p>
            <dl className="space-y-1.5">
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
          </div>
        )}
      </div>
      </div>

      {/* 하단: 버튼 또는 입력 (시트) */}
      <div className="relative -mt-6 shrink-0 rounded-t-[28px] bg-[var(--bg)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_-12px_24px_-16px_rgba(30,20,70,0.6)]">
        {mode === "choose" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" variant="ghost" onClick={() => enter("login")}>
                로그인
              </Button>
              <Button size="lg" onClick={() => (canSignup ? enter("signup") : setError("지금은 회원가입을 받지 않아요. 운영자에게 문의해 주세요."))}>
                회원가입
              </Button>
            </div>
            <p className="mt-3 min-h-5 text-center text-xs text-ink-2/80" role="status">
              {error ?? "비밀번호를 잊었다면 운영자에게 문의해 주세요."}
            </p>
          </>
        ) : (
          <SafeForm onSubmit={onSubmit} noValidate className="space-y-2.5">
            {field === "agreePrivacy" ? (
              <div className={`flex items-center rounded-2xl border px-3 ${error ? "border-bad/70" : "border-line"}`}>
                <label className="flex min-h-12 flex-1 items-center gap-3 text-[14px]">
                  <input
                    type="checkbox"
                    name="agreePrivacy"
                    checked={values.agreePrivacy}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, agreePrivacy: e.target.checked }));
                      setError(null);
                    }}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "auth-msg" : undefined}
                    className="h-5 w-5 shrink-0 accent-accent"
                  />
                  {PRIVACY_CONSENT.title}
                </label>
                <button
                  type="button"
                  onClick={() => setShowTerms((o) => !o)}
                  aria-expanded={showTerms}
                  aria-controls="auth-terms"
                  className="min-h-11 shrink-0 px-1 text-[13px] text-ink-2 underline underline-offset-4"
                >
                  {showTerms ? "닫기" : "보기"}
                </button>
              </div>
            ) : (
              <div className="relative">
                <label htmlFor="auth-input" className="sr-only">
                  {meta.label}
                </label>
                {/* 비밀번호 단계에서 비밀번호 관리자가 계정을 알아보도록 이메일을 함께 둔다 */}
                {isPassword && <input type="email" name="username" autoComplete="username" value={values.email} readOnly tabIndex={-1} aria-hidden className="sr-only" />}
                <input
                  ref={inputRef}
                  id="auth-input"
                  name={field}
                  type={isPassword && !showPw ? "password" : meta.type === "email" ? "email" : "text"}
                  value={values[field] as string}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={checkCaps}
                  onKeyUp={checkCaps}
                  onBlur={() => setCaps(false)}
                  placeholder={tapHint ? `여기를 눌러 ${meta.label} 입력` : meta.label}
                  onFocus={() => setTapHint(false)}
                  autoComplete={mode === "login" ? (field === "email" ? "username" : "current-password") : meta.autoComplete}
                  inputMode={meta.inputMode}
                  autoCapitalize={field === "inviteCode" ? "characters" : field === "displayName" ? "sentences" : "none"}
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={field === "displayName" ? DISPLAY_NAME_MAX + 10 : 120}
                  enterKeyHint={last ? (mode === "login" ? "go" : "done") : "next"}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "auth-msg" : undefined}
                  className={`${inputCls} h-14 text-[17px] ${tapHint ? "animate-pulse border-accent! ring-2 ring-accent/60" : ""} ${isPassword ? "pr-14" : ""} ${field === "inviteCode" ? "uppercase tracking-widest" : ""} ${error ? "border-bad/70!" : ""}`}
                />
                {isPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPw((v) => !v);
                      inputRef.current?.focus({ preventScroll: true });
                    }}
                    aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                    aria-pressed={showPw}
                    className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-ink-2"
                  >
                    <EyeIcon off={showPw} />
                  </button>
                )}
              </div>
            )}
            <p id="auth-msg" role={error ? "alert" : undefined} className={`min-h-5 px-1 text-[13px] ${error ? "text-bad" : caps ? "text-warn" : "text-ink-2/80"}`}>
              {error ??
                (caps && isPassword
                  ? "Caps Lock이 켜져 있어요."
                  : field === "passwordConfirm" && values.passwordConfirm && values.password === values.passwordConfirm
                    ? "비밀번호가 같아요."
                    : "")}
            </p>
            <Button type="submit" size="lg" loading={busy} className="w-full" onMouseDown={(e) => e.preventDefault()}>
              {last ? (mode === "login" ? "로그인" : "가입하고 시작하기") : "다음"}
            </Button>
          </SafeForm>
        )}
      </div>
    </div>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {off ? (
        <>
          <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-3.2 4.3M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a10.6 10.6 0 0 0 5.4-1.4" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          <path d="M2 2l20 20" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}
