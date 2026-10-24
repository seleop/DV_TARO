/**
 * 로그인 후 돌아갈 경로(?next=). 같은 사이트의 경로만 허용해 다른 사이트로 보내는 오픈 리다이렉트를 막는다.
 * 클라이언트·서버 양쪽에서 쓴다.
 */
export const DEFAULT_NEXT = "/";

/** proxy.ts가 요청 경로를 서버 컴포넌트에 넘길 때 쓰는 요청 헤더 (클라이언트가 보낸 같은 이름의 값은 덮어쓴다) */
export const PATH_HEADER = "x-dv-path";

const AUTH_PAGES = ["/login", "/signup"];

export function safeNextPath(raw: unknown): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return DEFAULT_NEXT;
  // "//evil.com", "/\evil.com"은 브라우저가 다른 호스트로 해석한다. 제어 문자도 거부한다.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\") || /[\u0000-\u001f\\]/.test(raw)) return DEFAULT_NEXT;
  let url: URL;
  try {
    url = new URL(raw, "http://same.invalid");
  } catch {
    return DEFAULT_NEXT;
  }
  if (url.origin !== "http://same.invalid") return DEFAULT_NEXT;
  if (AUTH_PAGES.includes(url.pathname) || url.pathname.startsWith("/api/")) return DEFAULT_NEXT;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** 로그인 화면 주소. 기본 경로면 ?next=를 붙이지 않는다. */
export function loginHref(next: string, page: "/login" | "/signup" = "/login"): string {
  const safe = safeNextPath(next);
  return safe === DEFAULT_NEXT ? page : `${page}?next=${encodeURIComponent(safe)}`;
}

/** 생년월일(내 사주)이 없어도 들어갈 수 있는 화면: 출생 정보 이어 하기(/start), MY(로그아웃·계정 삭제), 프로필 설정, 관리자 화면 */
export function isBirthOptionalPath(path: string): boolean {
  const p = path.split(/[?#]/)[0];
  return ["/start", "/me", "/admin"].some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}
