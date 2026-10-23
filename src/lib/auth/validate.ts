/**
 * 로그인·회원가입 입력 검증 (화면에서 입력 중 바로 보여 주는 용도).
 * 최종 검증은 서버(zod)가 다시 한다. 규칙은 /api/auth/signup 과 맞춘다.
 */
export type SignupValues = {
  email: string;
  password: string;
  passwordConfirm: string;
  displayName: string;
  inviteCode: string;
  agreePrivacy: boolean;
};
export type SignupField = keyof SignupValues;
export type LoginValues = { email: string; password: string };
export type FieldErrors<F extends string> = Partial<Record<F, string>>;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
export const DISPLAY_NAME_MAX = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(v: string): string | undefined {
  const s = v.trim();
  if (!s) return "이메일을 입력하세요.";
  if (s.length > 120) return "이메일이 너무 길어요.";
  if (!EMAIL_RE.test(s)) return "이메일 형식이 올바르지 않아요.";
}

export function validateLogin(v: LoginValues): FieldErrors<keyof LoginValues> {
  const e: FieldErrors<keyof LoginValues> = {};
  const em = emailError(v.email);
  if (em) e.email = em;
  if (!v.password) e.password = "비밀번호를 입력하세요.";
  return e;
}

export function validateSignup(v: SignupValues, opts: { inviteRequired: boolean }): FieldErrors<SignupField> {
  const e: FieldErrors<SignupField> = {};
  const em = emailError(v.email);
  if (em) e.email = em;
  if (!v.password) e.password = "비밀번호를 입력하세요.";
  else if (v.password.length < PASSWORD_MIN) e.password = `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요. (지금 ${v.password.length}자)`;
  else if (v.password.length > PASSWORD_MAX) e.password = `비밀번호는 ${PASSWORD_MAX}자 이하여야 해요.`;
  if (!v.passwordConfirm) e.passwordConfirm = "비밀번호를 한 번 더 입력하세요.";
  else if (v.password !== v.passwordConfirm) e.passwordConfirm = "비밀번호가 서로 달라요.";
  const name = v.displayName.trim();
  if (!name) e.displayName = "닉네임을 입력하세요.";
  else if ([...name].length > DISPLAY_NAME_MAX) e.displayName = `닉네임은 ${DISPLAY_NAME_MAX}자 이하여야 해요.`;
  if (opts.inviteRequired && !v.inviteCode.trim()) e.inviteCode = "초대 코드를 입력하세요.";
  if (!v.agreePrivacy) e.agreePrivacy = "개인정보 수집·이용에 동의해야 가입할 수 있어요.";
  return e;
}

/** 서버 오류(issues 또는 오류 코드)를 입력칸별 오류로 나눈다. 칸에 붙지 않는 오류는 rest로 남긴다. */
export function splitServerError<F extends string>(
  err: { code: string; message: string; issues: Array<{ path: string; message: string }> },
  fields: readonly F[],
  codeToField: Partial<Record<string, F>> = {},
): { fields: FieldErrors<F>; rest: string | null } {
  const out: FieldErrors<F> = {};
  const rest: string[] = [];
  for (const i of err.issues) {
    const f = i.path.split(".")[0] as F;
    if (fields.includes(f)) out[f] ??= i.message;
    else rest.push(i.message);
  }
  const byCode = codeToField[err.code];
  if (byCode) out[byCode] ??= err.message;
  else if (!err.issues.length) rest.push(err.message);
  else if (rest.length) rest.unshift(err.message);
  return { fields: out, rest: rest.length ? rest.join(" ") : null };
}
