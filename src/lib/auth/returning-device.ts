/**
 * 이 기기에서 가입·로그인한 적이 있는지 (진입 화면을 고르는 데만 쓴다. 로그인 여부·보안과는 무관).
 * 2026-10-24 사용자 결정: 최초 접속이면 우주 배경에서 터치 한 번으로 바로 회원가입 1단계,
 * 가입·로그인한 적 있는 기기면 우주 배경에 로그인·회원가입 버튼(별이 없음).
 * 기기 저장소(localStorage)를 못 쓰는 환경이면 늘 최초 접속으로 본다(작은 로그인 링크로 로그인할 수 있다).
 */
const KEY = "dvtaro.returning";

export type SignupModeName = "open" | "invite" | "closed";
export type EntryScreen = "intro" | "choose";

/** 가입·로그인에 성공했거나 로그아웃할 때 표시한다 */
export function markReturningDevice() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* 저장소 사용 불가 */
  }
}

export function readReturningDevice(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** 다른 탭에서 표시가 바뀌면 다시 읽는다 (useSyncExternalStore용) */
export function subscribeReturningDevice(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** 진입 화면: 가입·로그인한 적 있는 기기거나 가입을 받지 않으면 버튼 화면, 아니면 터치해 가입을 시작하는 첫 화면 */
export function entryScreen(returning: boolean, signupMode: SignupModeName): EntryScreen {
  return returning || signupMode === "closed" ? "choose" : "intro";
}
