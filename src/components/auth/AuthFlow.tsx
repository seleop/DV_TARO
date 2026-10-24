"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { BRAND } from "@/config/brand";
import { PRIVACY_CONSENT } from "@/config/privacy";
import { ApiError, api, errorText } from "@/lib/client";
import { DISPLAY_NAME_MAX, splitServerError, validateLogin, validateSignup, type SignupField, type SignupValues } from "@/lib/auth/validate";
import { entryScreen, markReturningDevice, readReturningDevice, subscribeReturningDevice } from "@/lib/auth/returning-device";
import type { MascotState } from "@/config/mascot-assets";
import { FortuneMascot } from "../FortuneMascot";
import { SafeForm } from "../SafeForm";
import { Button, inputCls } from "../ui";
import { AuthCosmos } from "./AuthCosmos";
import type { AuthScreen } from "./signupJourney";
import { useVisualViewport } from "./useVisualViewport";

/** entry: 진입 화면(이 기기 기록에 따라 첫 화면 또는 버튼 화면) */
type Mode = "entry" | "login" | "signup";
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
 * 인증 화면 (배경은 모두 우주 유람 AuthCosmos, 2026-10-24 사용자 결정):
 * - 최초 접속(이 기기에서 가입·로그인한 적 없음): 우주 배경과 '화면을 터치해 시작하기'만. 어디든 터치하면 바로 회원가입 1단계.
 *   이미 계정이 있으면 작은 '로그인' 링크로 (회원가입 1단계에도 같은 링크)
 * - 가입·로그인한 적 있는 기기: 별똥별이 날아가는 우주 배경에 로그인·회원가입 버튼 (별이 없음)
 * - 로그인: 우주 배경 그대로 이메일·비밀번호를 한 칸씩 (별이 없음)
 * - 회원가입: 단계마다 우주 유람이 다르게 움직이고, 별이 하나씩 이어져 별자리가 된다 (별이가 아래 구석에서 말을 건넴)
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
  // 별이의 한 번 재생 동작 (끝나면 대기 동작으로 돌아간다). 별이는 회원가입 중에만 보인다
  const [reaction, setReaction] = useState<{ state: MascotState; id: number } | null>(null);
  const react = (state: MascotState) => setReaction((r) => ({ state, id: (r?.id ?? 0) + 1 }));
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMode = useRef<Mode>(initialMode);
  const [tapHint, setTapHint] = useState(false);
  // 이 기기에서 가입·로그인한 적 있는지: 서버 렌더·첫 그리기에서는 모름(null) → 브라우저에서 읽어 정한다
  const returning = useSyncExternalStore<boolean | null>(subscribeReturningDevice, readReturningDevice, () => null);
  const pushed = useRef(false);
  const submitting = useRef(false);

  const canSignup = signupMode !== "closed";
  const steps = mode === "login" ? LOGIN_STEPS : signupSteps(signupMode === "invite");
  const field = steps[Math.min(step, steps.length - 1)];
  const meta = STEP[field];
  const last = step === steps.length - 1;
  const screen: AuthScreen = mode === "entry" ? (returning === null ? "pending" : entryScreen(returning, signupMode)) : mode;

  // 휴대폰 뒤로 가기로 진입 화면에 돌아온다
  useEffect(() => {
    const onPop = () => {
      pushed.current = false;
      setMode("entry");
      setError(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 입력칸으로 커서를 옮긴다.
  // - 진입 화면에서 막 들어왔으면 시트가 올라오는 연출(0.7초)이 끝난 뒤 키보드를 올린다 (연출 도중 화면이 툭 줄지 않게)
  // - 단계만 바뀌면 바로 (같은 입력칸을 계속 쓰므로 이미 열린 키보드는 유지된다)
  // iOS는 터치 직후가 아니면 키보드를 띄우지 않으므로, 커서가 안 들어가면 입력칸을 반짝여 눌러 달라고 안내한다.
  useEffect(() => {
    const from = prevMode.current;
    prevMode.current = mode;
    const el = inputRef.current;
    if (mode === "entry" || field === "agreePrivacy" || !el) return;
    const focus = () => {
      el.focus({ preventScroll: true });
      setTapHint(document.activeElement !== el);
    };
    if (from !== "entry") {
      el.focus({ preventScroll: true });
      return;
    }
    const t = setTimeout(focus, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 720);
    return () => clearTimeout(t);
  }, [mode, field]);

  function enter(m: Exclude<Mode, "entry">) {
    if (!pushed.current) {
      window.history.pushState({ auth: m }, "");
      pushed.current = true;
    }
    setMode(m);
    if (m === "signup") react("nod");
    setStep(0);
    setError(null);
    setDone(false);
    setShowPw(false);
    setShowTerms(false);
  }

  function back() {
    setError(null);
    setShowTerms(false);
    if (step > 0) setStep(step - 1);
    else if (pushed.current) window.history.back();
    else setMode("entry");
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
        markReturningDevice();
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
        // 다음부터 이 기기의 진입 화면은 로그인·회원가입 버튼
        markReturningDevice();
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
  const intro = screen === "intro" || screen === "pending";
  const signup = screen === "signup";
  const loginLink = "min-h-11 px-2 text-[13px] text-white/75 underline underline-offset-4";

  return (
    // 키보드가 오르내릴 때 높이가 툭 바뀌지 않게 부드럽게 따라간다
    <div className="fixed inset-x-0 top-0 z-10 mx-auto flex h-dvh w-full max-w-[440px] flex-col overflow-hidden transition-[height,top] duration-300 ease-out motion-reduce:transition-none" style={boxStyle}>
      {/* 화면 전체(시트 뒤까지) 우주 */}
      <AuthCosmos screen={screen} field={field} total={steps.length} step={step} done={done} />
      {/* 위: 무대(뒤로·진행 표시·별이·말) / 아래: 크림색 시트(버튼·입력). 첫 화면에서는 시트 없이 우주만 */}
      <div className="scene-dark relative flex min-h-0 flex-1 flex-col">
      {/* 상단: 뒤로 + 진행 표시(로그인) 또는 로그인 링크(회원가입 1단계) */}
      <div className="relative flex h-14 shrink-0 items-center px-3 pt-[env(safe-area-inset-top)]">
        {(mode === "login" || mode === "signup") && (
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
        {signup && step === 0 && !done && (
          <button type="button" onClick={() => enter("login")} className={`ml-auto ${loginLink}`}>
            이미 계정이 있어요? 로그인
          </button>
        )}
      </div>

      {/* 무대: 하늘 + (회원가입 중) 별이 */}
      <div className="relative min-h-0 flex-1 overflow-hidden pb-6">
        {/* 버튼 화면의 앱 이름 */}
        <div
          className={`absolute inset-x-0 top-[16%] text-center ${ease} ${screen === "choose" ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0"}`}
          aria-hidden={screen !== "choose"}
        >
          <p className="text-[15px] text-ink-2">우리끼리 보는 운세</p>
          <h1 className="text-gradient mt-1 text-[34px] font-extrabold leading-tight">{BRAND.appName}</h1>
        </div>

        {/* 별이: 회원가입 중에만 아래 구석에서 하늘을 올려다보며 말을 건넨다 */}
        <div
          className={`absolute h-[384px] w-[384px] origin-center ${ease} ${signup ? "opacity-100" : "pointer-events-none opacity-0"}`}
          style={{ left: "18%", top: "84%", transform: `translate(-50%,-50%) scale(${signup ? 0.26 : 0.2})` }}
          aria-hidden={!signup}
        >
          {/* 스프라이트 원본(384px) 크기로 그리고 배율로 줄인다 */}
          <FortuneMascot
            state={done ? "celebrate" : (reaction?.state ?? "idle")}
            playId={reaction?.id ?? 0}
            size={384}
            preload={["nod", "surprised", "celebrate"]}
            onAnimationComplete={(st) => {
              if (st !== "celebrate") setReaction((r) => (r?.state === st ? null : r));
            }}
          />
        </div>

        {/* 별이의 말풍선(회원가입) / 안내 문구(로그인: 별이 없이 화면 위쪽 가운데) */}
        {signup && (
          <p
            key={`signup-${field}`}
            aria-live="polite"
            className="absolute bottom-[12%] left-[34%] right-4 animate-[rise_.35s_ease-out] rounded-2xl bg-white px-4 py-2.5 text-[15px] font-semibold text-[#2a2440] shadow-lg motion-reduce:animate-none"
          >
            {done ? "별자리가 완성됐어!" : prompt}
          </p>
        )}
        {mode === "login" && (
          <p
            key={`login-${field}`}
            aria-live="polite"
            className="absolute inset-x-4 top-[10%] animate-[rise_.35s_ease-out] text-center text-[19px] font-bold text-white drop-shadow-[0_2px_10px_rgba(10,6,40,0.8)] motion-reduce:animate-none"
          >
            {field === "email" ? "다시 만나서 반가워요! 이메일을 알려 주세요." : "비밀번호를 입력해 주세요."}
          </p>
        )}

        {/* 동의 내용 (무대 위에 겹쳐 보여 준다) */}
        {showTerms && signup && field === "agreePrivacy" && (
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

      {/* 첫 화면: 어디든 터치하면 회원가입 1단계 (로그인 링크는 이 위에 있어 따로 눌린다) */}
      {intro && (
        <button
          type="button"
          onClick={() => enter("signup")}
          disabled={screen === "pending"}
          aria-label="화면을 터치해 회원가입 시작하기"
          className="absolute inset-0 z-20 cursor-pointer"
        />
      )}

      {/* 하단: 버튼 또는 입력 (시트). 첫 화면에서는 크림색 판이 아래로 내려가 있고 터치 안내만 보인다 */}
      <div className="relative -mt-6 shrink-0 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5">
        <div
          aria-hidden
          className={`absolute inset-0 rounded-t-[28px] bg-[var(--bg)] shadow-[0_-12px_24px_-16px_rgba(30,20,70,0.6)] ${ease} ${intro ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}
        />
        {intro ? (
          <div className="relative text-center">
            <p
              className={`flex h-14 items-center justify-center text-[16px] font-semibold text-white/90 drop-shadow-[0_2px_8px_rgba(10,6,40,0.8)] ${screen === "intro" ? "animate-pulse" : "opacity-0"}`}
            >
              화면을 터치해 시작하기
            </p>
            {/* 이미 계정이 있는 사람(새 기기 등): 터치 영역보다 위에 두어 따로 눌린다 */}
            <button type="button" onClick={() => enter("login")} disabled={screen === "pending"} className={`relative z-30 mt-1 ${loginLink}`}>
              이미 계정이 있어요? 로그인
            </button>
          </div>
        ) : screen === "choose" ? (
          <div className="relative">
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
          </div>
        ) : (
          <SafeForm onSubmit={onSubmit} noValidate className="relative space-y-2.5">
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
