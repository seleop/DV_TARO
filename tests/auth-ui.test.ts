import { describe, expect, it } from "vitest";
import { isBirthOptionalPath, loginHref, safeNextPath } from "@/lib/auth/next-path";
import { splitServerError, validateLogin, validateSignup, type SignupValues } from "@/lib/auth/validate";

describe("로그인 후 돌아갈 경로(?next=)", () => {
  it("같은 사이트 경로만 허용한다", () => {
    expect(safeNextPath("/today")).toBe("/today");
    expect(safeNextPath("/saju/abc?tab=1#x")).toBe("/saju/abc?tab=1#x");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "/a\\b","javascript:alert(1)", "today", "", undefined, ["/a"], "/\u0000x"]) {
      expect(safeNextPath(bad)).toBe("/");
    }
  });

  it("로그인·가입 화면과 API로는 돌려보내지 않는다", () => {
    expect(safeNextPath("/login")).toBe("/");
    expect(safeNextPath("/signup?x=1")).toBe("/");
    expect(safeNextPath("/api/me")).toBe("/");
  });

  it("loginHref는 기본 경로면 ?next=를 생략하고 나머지는 인코딩한다", () => {
    expect(loginHref("/")).toBe("/login");
    expect(loginHref("//evil.example")).toBe("/login");
    expect(loginHref("/saju/1?a=b")).toBe("/login?next=%2Fsaju%2F1%3Fa%3Db");
  });

  it("생년월일 없이 들어갈 수 있는 화면은 MY·프로필·관리자뿐", () => {
    for (const p of ["/me", "/me/profile?welcome=1", "/admin", "/admin/users"]) expect(isBirthOptionalPath(p)).toBe(true);
    for (const p of ["/", "/today", "/tarot", "/saju/1", "/media", "/administrator"]) expect(isBirthOptionalPath(p)).toBe(false);
  });
});

describe("로그인·가입 입력 검증", () => {
  const ok: SignupValues = { email: "a@example.test", password: "password-1", passwordConfirm: "password-1", displayName: "닉", inviteCode: "", agreePrivacy: true };

  it("올바른 입력이면 오류가 없다", () => {
    expect(validateSignup(ok, { inviteRequired: false })).toEqual({});
    expect(validateLogin({ email: " a@example.test ", password: "x" })).toEqual({});
  });

  it("칸별로 오류를 낸다", () => {
    const e = validateSignup({ email: "nope", password: "short", passwordConfirm: "other", displayName: "  ", inviteCode: "", agreePrivacy: false }, { inviteRequired: true });
    expect(Object.keys(e).sort()).toEqual(["agreePrivacy", "displayName", "email", "inviteCode", "password", "passwordConfirm"]);
    expect(e.password).toContain("8자 이상");
    expect(validateSignup({ ...ok, displayName: "가".repeat(21) }, { inviteRequired: false }).displayName).toContain("20자");
    expect(validateSignup({ ...ok, password: "x".repeat(73), passwordConfirm: "x".repeat(73) }, { inviteRequired: false }).password).toContain("72자");
  });

  it("서버 오류를 입력칸에 나눠 붙인다", () => {
    const fields = ["email", "password", "passwordConfirm"] as const;
    expect(splitServerError({ code: "VALIDATION_ERROR", message: "입력값을 확인해 주세요.", issues: [{ path: "passwordConfirm", message: "다름" }] }, fields)).toEqual({
      fields: { passwordConfirm: "다름" },
      rest: null,
    });
    expect(splitServerError({ code: "EMAIL_TAKEN", message: "이미 가입", issues: [] }, fields, { EMAIL_TAKEN: "email" })).toEqual({ fields: { email: "이미 가입" }, rest: null });
    expect(splitServerError({ code: "AUTH_FAILED", message: "실패", issues: [] }, fields)).toEqual({ fields: {}, rest: "실패" });
    expect(splitServerError({ code: "VALIDATION_ERROR", message: "확인", issues: [{ path: "extra", message: "모름" }] }, fields).rest).toBe("확인 모름");
  });
});
