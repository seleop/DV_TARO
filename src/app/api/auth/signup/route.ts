import { z } from "zod";
import { PRIVACY_CONSENT } from "@/config/privacy";
import { handler, json } from "@/lib/api";
import { getAuthAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signUp } from "@/lib/repo/users";

const SignupBody = z
  .object({
    email: z.string().trim().toLowerCase().email("이메일 형식이 올바르지 않아요.").max(120, "이메일이 너무 길어요."),
    password: z.string().min(8, "비밀번호는 8자 이상이어야 해요.").max(72, "비밀번호는 72자 이하여야 해요."),
    passwordConfirm: z.string(),
    displayName: z.string().trim().min(1, "닉네임을 입력하세요.").max(20, "닉네임은 20자 이하여야 해요."),
    inviteCode: z.string().trim().max(40).optional(),
    agreePrivacy: z.literal(true, { error: "개인정보 수집·이용에 동의해야 가입할 수 있어요." }),
  })
  .strict()
  .refine((v) => v.password === v.passwordConfirm, { message: "비밀번호가 서로 달라요.", path: ["passwordConfirm"] });

/** 회원가입: 이메일·비밀번호·닉네임 + 개인정보 동의 → Supabase Auth 계정 생성 → 프로필 생성 → 바로 로그인(세션 쿠키) */
export const POST = handler({ auth: "none" }, async ({ body }) => {
  const b = SignupBody.parse(body);
  const user = await signUp(getAuthAdmin(), {
    email: b.email,
    password: b.password,
    displayName: b.displayName,
    inviteCode: b.inviteCode,
    privacyVersion: PRIVACY_CONSENT.version,
  });
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signInWithPassword(b.email, b.password);
  return json({ user: { id: user.id, displayName: user.displayName, role: user.role } }, 201);
});
