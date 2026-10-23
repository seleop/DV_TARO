import "server-only";

export type SignupMode = "open" | "invite" | "closed";

/**
 * 로그인·가입 화면용: SIGNUP_MODE만 읽는다.
 * 전체 설정(getConfig)을 읽으면 다른 환경변수가 하나만 빠져도 화면이 깨지므로 따로 둔다.
 * 요청 시점에 읽으므로 가입 방식을 바꿔도 재배포 없이 반영된다. 잘못된 값이면 가입을 막는다.
 */
export function getSignupMode(): SignupMode {
  const v = process.env.SIGNUP_MODE?.trim();
  if (!v) return "open";
  return v === "open" || v === "invite" || v === "closed" ? v : "closed";
}
