"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { BRAND } from "@/config/brand";
import { PRIVACY_CONSENT } from "@/config/privacy";
import { ApiError, api, errorText } from "@/lib/client";
import { DISPLAY_NAME_MAX, splitServerError, validateLogin, validateSignup, type SignupField, type SignupValues } from "@/lib/auth/validate";
import { entryScreen, markReturningDevice, readReturningDevice, subscribeReturningDevice } from "@/lib/auth/returning-device";
import { FortuneMascot } from "../FortuneMascot";
import { SafeForm } from "../SafeForm";
import { Button, inputCls } from "../ui";
import { AuthCosmos } from "./AuthCosmos";
import { SpeechBubble } from "./SpeechBubble";
import { ChoiceButtons, TimeFields, WheelPicker } from "./BirthInputs";
import { BIRTH_DEFAULT, BIRTH_FIELDS_ALL, BIRTH_MIN_YEAR, birthMaxYear, birthPayload, birthStarIndex, birthStepError, birthSteps, daysIn, type BirthField, type BirthValues } from "./birthSteps";
import type { AuthScreen } from "./signupJourney";
import { useVisualViewport } from "./useVisualViewport";

/** entry: 진입 화면(이 기기 기록에 따라 첫 화면 또는 버튼 화면) / birth: 가입에 이어지는 출생 정보 */
type Mode = "entry" | "login" | "signup" | "birth";
type SignupMode = "open" | "invite" | "closed";

/** 단계별 입력칸 설정과 '???'가 건네는 말 */
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
/** 출생 정보 단계에서 '???'가 건네는 말 */
const BIRTH_PROMPT: Record<BirthField, string> = {
  calendar: "이제 너에 대해 알려줘.\n생일은 양력이야, 음력이야?",
  year: "몇 년에 태어났어?",
  month: "몇 월이야?",
  day: "며칠이야?",
  leap: "그 달이 윤달이었어?",
  time: "태어난 시각도 알아?\n몰라도 괜찮아.",
  gender: "마지막이야! 성별을 알려줄래?\n대운을 볼 때만 써.",
};
const LOGIN_STEPS: SignupField[] = ["email", "password"];
const signupSteps = (invite: boolean): SignupField[] =>
  invite ? ["email", "password", "passwordConfirm", "displayName", "inviteCode", "agreePrivacy"] : ["email", "password", "passwordConfirm", "displayName", "agreePrivacy"];
const CODE_FIELD: Partial<Record<string, SignupField>> = { EMAIL_TAKEN: "email", INVALID_EMAIL: "email", WEAK_PASSWORD: "password", INVALID_INVITE: "inviteCode", INVALID_CREDENTIALS: "password" };
const EMPTY: SignupValues = { email: "", password: "", passwordConfirm: "", displayName: "", inviteCode: "", agreePrivacy: false };
/** 마지막에 '???'가 별이로 정체를 드러낸 뒤 오늘의 운세를 볼지 묻기까지 */
const REVEAL_MS = 2800;
/** 답을 고른 뒤 별똥별이 은하 중심의 빛으로 들어가는 모습을 보여 주고 이동하기까지 */
const LEAVE_MS = 1500;
/**
 * 가입 마무리 (2026-10-24 사용자 결정): reveal(별이 정체 공개) → ask('오늘의 운세를 한 번 봐줄까?' 응/다음에)
 * → leaving(고른 곳으로: 응=오늘의 운세, 다음에=홈)
 */
type Finale = null | "reveal" | "ask" | { leaving: "/today" | "/" };
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/**
 * 인증 화면 (배경은 모두 우주 유람 AuthCosmos, 2026-10-24 사용자 결정):
 * - 최초 접속(이 기기에서 가입·로그인한 적 없음): 우주 배경과 '화면을 터치해 시작하기'만. 어디든 터치하면 바로 회원가입 1단계.
 *   이미 계정이 있으면 작은 '로그인' 링크로 (회원가입 1단계에도 같은 링크)
 * - 가입·로그인한 적 있는 기기: 별똥별이 날아가는 우주 배경에 로그인·회원가입 버튼 (별이 없음)
 * - 로그인: 우주 배경 그대로 이메일·비밀번호를 한 칸씩 (별이 없음)
 * - 회원가입 → 계정을 만든 뒤 같은 우주에서 출생 정보(양력/음력·연·월·일·윤달·시각·성별)로 이어진다.
 *   정체 모를 화자 '???'가 묻고, 단계마다 실존 별자리(전갈자리)의 별이 하나씩 이어진다.
 *   마지막에 별자리가 완성되면 '???'가 별이로 정체를 드러낸 뒤 오늘의 운세로 간다.
 *   출생 정보를 넣기 전에 나갔다면 다시 로그인할 때 /start에서 출생 정보부터 이어 한다(initialMode="birth").
 * 화면은 실제로 보이는 영역 크기에 맞춰 스크롤 없이 쓴다. 입력칸은 한 개를 계속 써서 단계가 바뀌어도 키보드가 닫히지 않는다.
 */
export function AuthFlow({ initialMode, next, signupMode }: { initialMode: Mode; next: string; signupMode: SignupMode }) {
  const router = useRouter();
  const vv = useVisualViewport();
  // 키보드가 없을 때의 화면 높이(지금까지 본 가장 큰 높이, 화면 폭이 바뀌면 다시 잼): 우주 배경은 이 높이를 유지한다
  const [fullView, setFullView] = useState<{ h: number; w: number } | null>(null);
  if (vv && (!fullView || vv.width !== fullView.w || vv.height > fullView.h)) setFullView({ h: vv.height, w: vv.width });
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<SignupValues>(EMPTY);
  const [birth, setBirth] = useState<BirthValues>(BIRTH_DEFAULT);
  const [bStep, setBStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 출생 정보까지 모두 저장해 별자리가 완성됨 → '???'가 별이로 정체를 드러내고 오늘의 운세를 볼지 묻는다
  const [finale, setFinale] = useState<Finale>(null);
  const done = finale !== null;
  const leaving = typeof finale === "object" && finale !== null;
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  const prevMode = useRef<Mode>(initialMode);
  const modeRef = useRef<Mode>(initialMode);
  const [tapHint, setTapHint] = useState(false);
  // 이 기기에서 가입·로그인한 적 있는지: 서버 렌더·첫 그리기에서는 모름(null) → 브라우저에서 읽어 정한다
  const returning = useSyncExternalStore<boolean | null>(subscribeReturningDevice, readReturningDevice, () => null);
  const pushed = useRef(false);
  const submitting = useRef(false);

  const canSignup = signupMode !== "closed";
  const accountSteps = signupSteps(signupMode === "invite");
  const steps = mode === "login" ? LOGIN_STEPS : accountSteps;
  const field = steps[Math.min(step, steps.length - 1)];
  const meta = STEP[field];
  const last = step === steps.length - 1;
  const bSteps = birthSteps(birth.calendar);
  const bField = bSteps[Math.min(bStep, bSteps.length - 1)];
  const bLast = bStep === bSteps.length - 1;
  const screen: AuthScreen = mode === "entry" ? (returning === null ? "pending" : entryScreen(returning, signupMode)) : mode;
  // 별자리 진행: 가입 단계 + 출생 정보 7단계(양력이면 윤달 별은 지나가며 켜진다)
  const starTotal = accountSteps.length + BIRTH_FIELDS_ALL.length;
  const starLit = mode === "birth" ? accountSteps.length + birthStarIndex(bField) : mode === "signup" ? step : 0;

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // 휴대폰 뒤로 가기로 진입 화면에 돌아온다. 계정을 만든 뒤(출생 정보)에는 되돌아가지 않고 그 자리에 머문다
  useEffect(() => {
    const onPop = () => {
      if (modeRef.current === "birth") {
        window.history.pushState({ auth: "birth" }, "");
        return;
      }
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
  // - 출생 정보는 목록·버튼으로 고르므로 키보드를 닫고, 시각 단계에서만 '시' 칸으로
  // iOS는 터치 직후가 아니면 키보드를 띄우지 않으므로, 커서가 안 들어가면 입력칸을 반짝여 눌러 달라고 안내한다.
  useEffect(() => {
    const from = prevMode.current;
    prevMode.current = mode;
    if (mode === "birth") {
      if (bField === "time" && birth.timeKnown) hourRef.current?.focus({ preventScroll: true });
      else if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur();
      return;
    }
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
    // 시각을 몰라요/알아요를 바꿀 때마다 커서를 옮기지는 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, field, bField]);

  function enter(m: "login" | "signup") {
    if (!pushed.current) {
      window.history.pushState({ auth: m }, "");
      pushed.current = true;
    }
    setMode(m);
    setStep(0);
    setError(null);
    setFinale(null);
    setShowPw(false);
    setShowTerms(false);
  }

  function back() {
    setError(null);
    setShowTerms(false);
    if (mode === "birth") {
      if (bStep > 0) setBStep(bStep - 1);
      return;
    }
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
    if (mode === "birth") return submitBirth();
    const err = stepError(field);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (!last) {
      setShowPw(false);
      setStep(step + 1);
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      if (mode === "login") {
        await api("/api/auth/login", { body: { email: values.email.trim(), password: values.password } });
        markReturningDevice();
        // 출생 정보가 아직 없으면 서버가 /start(우주 배경 출생 정보 단계)로 보낸다
        router.replace(next);
        router.refresh();
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
        // 계정이 생겼으니 같은 우주에서 출생 정보로 이어 간다 (뒤로 가기로 가입 화면에 돌아가지 않게)
        window.history.replaceState({ auth: "birth" }, "");
        setMode("birth");
        setBStep(0);
        setBusy(false);
        submitting.current = false;
      }
    } catch (e) {
      if (e instanceof ApiError) {
        const s = splitServerError(e, steps, CODE_FIELD);
        const target = steps.findIndex((f) => s.fields[f]);
        if (target >= 0) {
          setStep(target);
          setError(s.fields[steps[target]] ?? null);
        } else setError(s.rest);
      } else setError(errorText(e));
      setBusy(false);
      submitting.current = false;
    }
  }

  async function submitBirth() {
    const err = birthStepError(bField, birth);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (!bLast) {
      setBStep(bStep + 1);
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      await api("/api/me/birth", { method: "PUT", body: { birth: birthPayload(birth) } });
      // 별자리 완성 → '???'가 별이로 정체를 드러낸다. 우주는 그대로 두고, 잠시 뒤 오늘의 운세를 볼지 한 번 묻는다
      setFinale("reveal");
      setBusy(false);
      await new Promise((r) => setTimeout(r, reducedMotion() ? 1200 : REVEAL_MS));
      setFinale((f) => (f === "reveal" ? "ask" : f));
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
      submitting.current = false;
    }
  }

  /** 마지막 질문의 답: 별똥별이 은하 중심의 빛으로 들어가는 모습을 잠깐 보여 준 뒤 이동 */
  async function leave(to: "/today" | "/") {
    setFinale({ leaving: to });
    await new Promise((r) => setTimeout(r, reducedMotion() ? 300 : LEAVE_MS));
    router.replace(to);
    router.refresh();
  }

  const setValue = (v: string) => {
    setValues((cur) => ({ ...cur, [field]: v }));
    if (error) setError(null);
  };
  const setB = (patch: Partial<BirthValues>) => {
    setBirth((cur) => {
      const nextB = { ...cur, ...patch };
      // 달·연·달력이 바뀌어 그날이 없어지면 그 달의 마지막 날로
      nextB.day = Math.min(nextB.day, daysIn(nextB.calendar, nextB.year, nextB.month));
      if (nextB.calendar === "solar") nextB.leap = false;
      return nextB;
    });
    if (error) setError(null);
  };
  const checkCaps = (e: KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") setCaps(e.getModifierState("CapsLock"));
  };

  const isPassword = meta.type === "password";
  const asking = mode === "signup" || mode === "birth";
  const boxStyle = vv ? { height: vv.height, top: vv.top } : undefined;
  // 우주 배경: 보이는 영역의 위쪽에만 맞추고 높이는 키보드가 없을 때 그대로 (키보드가 올라와도 밀리거나 찌그러지지 않게)
  const bgStyle = vv && fullView ? { height: fullView.h, top: vv.top } : undefined;
  const ease = "transition-all duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none";
  const intro = screen === "intro" || screen === "pending";
  const loginLink = "min-h-11 px-2 text-[13px] text-white/75 underline underline-offset-4";
  const question = leaving
    ? finale.leaving === "/today"
      ? "좋아! 별자리를 따라 오늘의 운세로 가자."
      : "알겠어! 보고 싶을 때 언제든 불러 줘."
    : finale === "ask"
      ? "방금 알려준 대로\n오늘의 운세를 한 번 봐줄까?"
      : finale === "reveal"
        ? "사실 나는 별이야!\n네 별자리가 완성됐어."
        : mode === "birth"
      ? bField === "calendar"
        ? `${initialMode === "birth" ? "다시 왔구나!" : "가입 완료!"}\n${BIRTH_PROMPT.calendar}`
        : BIRTH_PROMPT[bField]
      : meta.signup;

  return (
    <>
    {/* 화면 전체(시트 뒤까지) 우주: 입력 화면 틀과 따로 두어 키보드가 올라와도 크기가 바뀌지 않는다 (그 아래는 키보드에 가려질 뿐) */}
    <div className="pointer-events-none fixed inset-x-0 top-0 z-10 mx-auto h-dvh w-full max-w-[440px]" style={bgStyle}>
      <AuthCosmos
        screen={screen}
        field={mode === "birth" ? bField : field}
        total={starTotal}
        lit={starLit}
        current={starLit}
        done={done}
        leaving={leaving}
        beat={asking ? (done ? starTotal : starLit) : undefined}
      />
    </div>
    {/* 입력 화면 틀: 키보드를 뺀 보이는 영역에 맞춘다. 키보드가 오르내릴 때 높이가 툭 바뀌지 않게 부드럽게 따라간다 */}
    <div className="fixed inset-x-0 top-0 z-10 mx-auto flex h-dvh w-full max-w-[440px] flex-col overflow-hidden transition-[height,top] duration-300 ease-out motion-reduce:transition-none" style={boxStyle}>
      {/* 위: 무대(뒤로·진행 표시·말) / 아래: 크림색 시트(버튼·입력). 첫 화면에서는 시트 없이 우주만 */}
      <div className="scene-dark relative flex min-h-0 flex-1 flex-col">
      {/* 상단: 뒤로 + 진행 표시(로그인) 또는 로그인 링크(회원가입 1단계) */}
      <div className="relative flex h-14 shrink-0 items-center px-3 pt-[env(safe-area-inset-top)]">
        {(mode === "login" || mode === "signup" || (mode === "birth" && bStep > 0 && !done)) && (
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
        {mode === "signup" && step === 0 && (
          <button type="button" onClick={() => enter("login")} className={`ml-auto ${loginLink}`}>
            이미 계정이 있어요? 로그인
          </button>
        )}
      </div>

      {/* 무대: 하늘 + (마지막에) 별이 */}
      <div className="relative min-h-0 flex-1 overflow-hidden pb-6">
        {/* 버튼 화면의 앱 이름 */}
        <div
          className={`absolute inset-x-0 top-[16%] text-center ${ease} ${screen === "choose" ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0"}`}
          aria-hidden={screen !== "choose"}
        >
          <p className="text-[15px] text-ink-2">우리끼리 보는 운세</p>
          <h1 className="text-gradient mt-1 text-[34px] font-extrabold leading-tight">{BRAND.appName}</h1>
        </div>

        {/* 별이: 가입·출생 정보 내내 '???'로 숨어 있다가, 별자리가 완성되면 아래 구석에 나타난다 */}
        <div
          className={`absolute h-[384px] w-[384px] origin-center ${ease} ${done ? "opacity-100" : "pointer-events-none opacity-0"}`}
          style={{ left: "18%", top: "84%", transform: `translate(-50%,-50%) scale(${done ? 0.28 : 0.14})` }}
          aria-hidden={!done}
        >
          {/* 스프라이트 원본(384px) 크기로 그리고 배율로 줄인다 */}
          <FortuneMascot state={done ? "celebrate" : "idle"} playId={done ? 1 : 0} size={384} preload={["celebrate"]} />
        </div>

        {/* '???'의 말 (가입·출생 정보): 한 글자씩 튀어 오르며 나타나고, 말이 바뀌면 통 튀어나온다. 마지막에 이름표가 '별이'로 */}
        {/* 아래 시트가 무대를 24px 덮으므로, 키보드 위 자동완성 띠 등으로 무대가 짧아져도 말풍선이 가려지지 않게 최소 간격을 둔다 */}
        {asking && (
          <div className={`absolute bottom-[max(12%,2.25rem)] right-4 ${ease} ${done ? "left-[36%]" : "left-4"}`}>
            <SpeechBubble
              id={leaving ? `leave-${finale.leaving}` : finale ? `finale-${finale}` : `${mode}-${mode === "birth" ? bField : field}`}
              label={done ? "별이" : "???"}
              text={question}
              accent={done}
            />
          </div>
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

      {/* 하단: 버튼 또는 입력 (시트). 첫 화면·별자리 완성 때는 크림색 판이 아래로 내려가 우주만 보인다 */}
      {/* 여백(2026-10-24 사용자 결정: 시안 A '여유 기본'): 좌우·위 24, 아래 24(안전 영역 이상), 요소 사이 16.
          판은 어두운 보랏빛 유리(글래스모피즘), 버튼은 진한 보라~남색 (globals.css .glass-night) */}
      <div className="glass-night relative -mt-6 shrink-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        <div
          aria-hidden
          className={`glass-sheet absolute inset-0 rounded-t-[28px] ${ease} ${intro || (done && finale !== "ask") ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}
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
            <div className="grid grid-cols-2 gap-4">
              <Button size="lg" variant="ghost" onClick={() => enter("login")}>
                로그인
              </Button>
              <Button size="lg" onClick={() => (canSignup ? enter("signup") : setError("지금은 회원가입을 받지 않아요. 운영자에게 문의해 주세요."))}>
                회원가입
              </Button>
            </div>
            <p className="mt-4 min-h-5 text-center text-xs text-ink-2/80" role="status">
              {error ?? "비밀번호를 잊었다면 운영자에게 문의해 주세요."}
            </p>
          </div>
        ) : finale === "ask" ? (
          // 마지막 질문: 오늘의 운세를 볼지 한 번 묻는다
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <Button size="lg" variant="ghost" onClick={() => leave("/")}>
                다음에 볼래
              </Button>
              <Button size="lg" onClick={() => leave("/today")}>
                응, 봐줘!
              </Button>
            </div>
            <p className="mt-4 min-h-5 text-center text-xs text-ink-2/80">홈에서도 언제든 볼 수 있어요.</p>
          </div>
        ) : done ? (
          // 별자리 완성(별이 공개)·이동 중: 입력 없이 우주와 별이만
          <p className="relative flex h-14 items-center justify-center text-[15px] font-semibold text-white/85 drop-shadow-[0_2px_8px_rgba(10,6,40,0.8)]" role="status">
            {leaving ? "별자리를 따라 가는 중…" : ""}
          </p>
        ) : (
          <SafeForm onSubmit={onSubmit} noValidate className="relative">
            {mode === "birth" ? (
              <BirthStep field={bField} birth={birth} setB={setB} invalid={!!error} hourRef={hourRef} />
            ) : field === "agreePrivacy" ? (
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
            <p id="auth-msg" role={error ? "alert" : undefined} className={`mt-2.5 min-h-5 px-1 text-[13px] ${error ? "text-bad" : caps ? "text-warn" : "text-ink-2/80"}`}>
              {error ??
                (mode !== "birth" && caps && isPassword
                  ? "Caps Lock이 켜져 있어요."
                  : mode === "signup" && field === "passwordConfirm" && values.passwordConfirm && values.password === values.passwordConfirm
                    ? "비밀번호가 같아요."
                    : mode === "birth" && (bField === "calendar" || bField === "gender")
                      ? "나중에 프로필에서 바꿀 수 있어요."
                      : "")}
            </p>
            <Button type="submit" size="lg" loading={busy} className="mt-4 w-full" onMouseDown={(e) => e.preventDefault()}>
              {mode === "birth" ? (bLast ? "별자리 완성하기" : "다음") : last ? (mode === "login" ? "로그인" : "가입하고 계속하기") : "다음"}
            </Button>
          </SafeForm>
        )}
      </div>
    </div>
    </>
  );
}

/** 출생 정보 한 단계의 입력: 양력/음력·윤달·성별은 큰 버튼, 연·월·일은 목록(휠), 시각은 시·분 숫자 */
function BirthStep({
  field,
  birth,
  setB,
  invalid,
  hourRef,
}: {
  field: BirthField;
  birth: BirthValues;
  setB: (patch: Partial<BirthValues>) => void;
  invalid: boolean;
  hourRef: React.Ref<HTMLInputElement>;
}) {
  switch (field) {
    case "calendar":
      return (
        <ChoiceButtons
          label="양력 또는 음력"
          value={birth.calendar}
          onChange={(calendar) => setB({ calendar })}
          options={[
            { value: "solar", label: "양력", hint: "일반 달력" },
            { value: "lunar", label: "음력", hint: "음력 생일" },
          ]}
        />
      );
    case "year":
      return <WheelPicker key="year" label="태어난 해" values={range(BIRTH_MIN_YEAR, birthMaxYear())} value={birth.year} onChange={(year) => setB({ year })} format={(v) => `${v}년`} />;
    case "month":
      return <WheelPicker key="month" label="태어난 달" values={range(1, 12)} value={birth.month} onChange={(month) => setB({ month })} format={(v) => `${birth.calendar === "lunar" ? "음력 " : ""}${v}월`} />;
    case "day":
      return <WheelPicker key="day" label="태어난 날" values={range(1, daysIn(birth.calendar, birth.year, birth.month))} value={birth.day} onChange={(day) => setB({ day })} format={(v) => `${v}일`} />;
    case "leap":
      return (
        <ChoiceButtons
          label="윤달 여부"
          value={birth.leap ? "yes" : "no"}
          onChange={(v) => setB({ leap: v === "yes" })}
          options={[
            { value: "no", label: "평달", hint: "대부분 여기" },
            { value: "yes", label: "윤달" },
          ]}
        />
      );
    case "time":
      return (
        <TimeFields
          hour={birth.hour}
          minute={birth.minute}
          known={birth.timeKnown}
          invalid={invalid}
          onHour={(hour) => setB({ hour })}
          onMinute={(minute) => setB({ minute })}
          onKnown={(timeKnown) => setB({ timeKnown })}
          hourRef={hourRef}
        />
      );
    case "gender":
      return (
        <ChoiceButtons
          label="성별"
          value={birth.gender === "" ? "none" : birth.gender}
          onChange={(v) => setB({ gender: v === "none" ? "" : v })}
          options={[
            { value: "female", label: "여" },
            { value: "male", label: "남" },
            { value: "none", label: "선택 안 함" },
          ]}
        />
      );
  }
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
