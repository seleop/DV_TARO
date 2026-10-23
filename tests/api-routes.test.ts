import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Supabase 서버 클라이언트 모의 객체.
 * 실제로는 getClaims()가 JWT를 검증한다. 여기서는 "현재 로그인한 사용자 ID"를 변수로 흉내 낸다.
 */
const session: { userId: string | null } = { userId: null };
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getClaims: async () => ({ sub: session.userId }),
      signInWithPassword: async (email: string, password: string) => {
        const { fakeAuthAdmin } = await import("./helpers/db");
        const rec = fakeAuthAdmin.passwords.get(email);
        if (!rec || rec.password !== password || fakeAuthAdmin.banned.has(rec.id)) {
          return { userId: null };
        }
        session.userId = rec.id;
        return { userId: rec.id };
      },
      signOut: async () => {
        session.userId = null;
      },
    },
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("redirect");
  },
  notFound: () => {
    throw new Error("notFound");
  },
}));

const sajuRoute = await import("@/app/api/saju/route");
const sajuIdRoute = await import("@/app/api/saju/[id]/route");
const readingRoute = await import("@/app/api/saju/[id]/reading/route");
const adminStats = await import("@/app/api/admin/stats/route");
const adminUsers = await import("@/app/api/admin/users/[id]/route");
const loginRoute = await import("@/app/api/auth/login/route");
const signupRoute = await import("@/app/api/auth/signup/route");
const tarotRoute = await import("@/app/api/tarot/route");
const recordsRoute = await import("@/app/api/me/records/route");
const meRoute = await import("@/app/api/me/route");
const cronRoute = await import("@/app/api/cron/purge/route");
const birthRoute = await import("@/app/api/me/birth/route");
const { freshEnv, makeUser, rawPg } = await import("./helpers/db");
const { PRIVACY_CONSENT } = await import("@/config/privacy");

const ORIGIN = "http://localhost:3000";
function req(method: string, body?: unknown, headers: Record<string, string> = {}) {
  const h: Record<string, string> = { host: "localhost:3000", ...headers };
  if (method !== "GET" && !("origin" in headers)) h.origin = ORIGIN;
  if (body !== undefined) h["content-type"] = "application/json";
  return new Request(`${ORIGIN}/api/x`, { method, headers: h, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) });
}
const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
const loginAs = (userId: string | null) => void (session.userId = userId);
const birth = { calendar: "solar", year: 1992, month: 10, day: 24, timeKnown: true, hour: 5, minute: 30 };

describe("API 라우트", () => {
  beforeEach(async () => {
    await freshEnv({ JEOMBOM_ENABLED: "false", LIMIT_CALC_PER_USER_PER_DAY: "60", LIMIT_AI_PER_USER_PER_MINUTE: "10" });
    session.userId = null;
  });

  it("로그인하지 않으면 401", async () => {
    expect((await sajuRoute.GET(req("GET"), ctx())).status).toBe(401);
  });

  it("일반 사용자는 관리자 API에 403", async () => {
    const u = await makeUser();
    loginAs(u.id);
    expect((await adminStats.GET(req("GET"), ctx())).status).toBe(403);
  });

  it("Origin이 없거나 다른 출처의 변경 요청은 403", async () => {
    const u = await makeUser();
    loginAs(u.id);
    const noOrigin = new Request(`${ORIGIN}/api/saju`, { method: "POST", headers: { host: "localhost:3000", "content-type": "application/json" }, body: "{}" });
    expect((await sajuRoute.POST(noOrigin, ctx())).status).toBe(403);
    expect((await sajuRoute.POST(req("POST", { birth }, { origin: "https://evil.example" }), ctx())).status).toBe(403);
  });

  it("본문 크기 초과 413, JSON이 아니면 415, 깨진 JSON 400", async () => {
    const u = await makeUser();
    loginAs(u.id);
    expect((await sajuRoute.POST(req("POST", { birth: { pad: "x".repeat(20_000) } }), ctx())).status).toBe(413);
    const text = new Request(`${ORIGIN}/api/saju`, { method: "POST", headers: { host: "localhost:3000", origin: ORIGIN, "content-type": "text/plain" }, body: "hello" });
    expect((await sajuRoute.POST(text, ctx())).status).toBe(415);
    expect((await sajuRoute.POST(req("POST", "{broken"), ctx())).status).toBe(400);
  });

  it("입력 검증 오류는 400과 필드별 메시지를 주되 입력값을 되돌려주지 않는다", async () => {
    const u = await makeUser();
    loginAs(u.id);
    const r = await sajuRoute.POST(req("POST", { birth: { ...birth, year: 2023, month: 2, day: 29 } }), ctx());
    expect(r.status).toBe(400);
    const j = await r.json();
    expect(j.error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(j)).not.toContain("2023");
  });

  it("계산 → 대표 사주 지정 → 다른 사용자 차단 → AI 해석 → 삭제", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    loginAs(alice.id);
    const created = await sajuRoute.POST(req("POST", { label: "나", makePrimary: true, birth }), ctx());
    expect(created.status).toBe(201);
    const { calculation } = await created.json();
    expect(calculation.status).toBe("MATCH");
    expect(calculation.canonical.pillars.day.ganji).toBe("계유");
    const list = await (await sajuRoute.GET(req("GET"), ctx())).json();
    expect(list.primaryCalculationId).toBe(calculation.id);

    loginAs(bob.id);
    expect((await sajuIdRoute.GET(req("GET"), ctx({ id: calculation.id }))).status).toBe(404);
    expect((await sajuIdRoute.DELETE(req("DELETE"), ctx({ id: calculation.id }))).status).toBe(404);
    expect((await sajuIdRoute.PATCH(req("PATCH", { primary: true }), ctx({ id: calculation.id }))).status).toBe(404);
    expect((await readingRoute.POST(req("POST", {}), ctx({ id: calculation.id }))).status).toBe(404);

    loginAs(alice.id);
    expect((await readingRoute.POST(req("POST", { focus: ["직업"] }), ctx({ id: calculation.id }))).status).toBe(201);
    expect((await sajuIdRoute.DELETE(req("DELETE"), ctx({ id: calculation.id }))).status).toBe(200);
    expect((await sajuIdRoute.GET(req("GET"), ctx({ id: calculation.id }))).status).toBe(404);
  });

  it("같은 입력을 다시 계산하면 저장된 결과를 쓰고 계산 한도를 소모하지 않는다", async () => {
    await freshEnv({ JEOMBOM_ENABLED: "false", LIMIT_CALC_PER_USER_PER_DAY: "1" });
    const u = await makeUser();
    loginAs(u.id);
    const a = await (await sajuRoute.POST(req("POST", { birth }), ctx())).json();
    const again = await sajuRoute.POST(req("POST", { birth }), ctx());
    expect(again.status).toBe(201);
    expect((await again.json()).calculation.id).toBe(a.calculation.id);
    const r = await sajuRoute.POST(req("POST", { birth: { ...birth, minute: 31 } }), ctx());
    expect(r.status).toBe(429);
    expect((await r.json()).error.code).toBe("CALC_LIMIT_DAY");
  });

  it("전체 기록 삭제 API", async () => {
    const u = await makeUser();
    loginAs(u.id);
    await sajuRoute.POST(req("POST", { birth }), ctx());
    await tarotRoute.POST(req("POST", { question: "질문입니다", spread: "one" }), ctx());
    const r = await recordsRoute.DELETE(req("DELETE"), ctx());
    expect(await r.json()).toMatchObject({ ok: true, deleted: { calculations: 1, readings: 1 } });
    expect((await (await sajuRoute.GET(req("GET"), ctx())).json()).items).toEqual([]);
  });

  it("회원가입(이메일·비밀번호·비밀번호 확인·닉네임) → 바로 로그인 상태", async () => {
    const r = await signupRoute.POST(
      req("POST", { email: "New@Example.test", password: "password-1234", passwordConfirm: "password-1234", displayName: "새사람", agreePrivacy: true }),
      ctx(),
    );
    expect(r.status).toBe(201);
    expect(session.userId).not.toBeNull();
    const me = await (await meRoute.GET(req("GET"), ctx())).json();
    expect(me.user).toMatchObject({ email: "new@example.test", displayName: "새사람", primaryCalculationId: null });
  });

  it("비밀번호 확인이 다르거나 짧으면 400", async () => {
    const mismatch = await signupRoute.POST(req("POST", { email: "a@example.test", password: "password-1234", passwordConfirm: "password-9999", displayName: "에이", agreePrivacy: true }), ctx());
    expect(mismatch.status).toBe(400);
    expect(JSON.stringify(await mismatch.json())).toContain("비밀번호가 서로 달라요");
    const short = await signupRoute.POST(req("POST", { email: "b@example.test", password: "short", passwordConfirm: "short", displayName: "비", agreePrivacy: true }), ctx());
    expect(short.status).toBe(400);
  });

  it("개인정보 수집·이용 동의가 없으면 400(agreePrivacy 칸 오류), 동의하면 시각·버전을 기록한다", async () => {
    const base = { email: "consent@example.test", password: "password-1234", passwordConfirm: "password-1234", displayName: "동의" };
    for (const body of [base, { ...base, agreePrivacy: false }]) {
      const r = await signupRoute.POST(req("POST", body), ctx());
      expect(r.status).toBe(400);
      expect((await r.json()).error.issues).toEqual([expect.objectContaining({ path: "agreePrivacy" })]);
    }
    const ok = await signupRoute.POST(req("POST", { ...base, agreePrivacy: true }), ctx());
    expect(ok.status).toBe(201);
    const { user } = await ok.json();
    const row = (await (await rawPg()).query<{ privacy_agreed_at: Date | null; privacy_version: string | null }>("select privacy_agreed_at, privacy_version from public.profiles where id = $1", [user.id])).rows[0];
    expect(row.privacy_agreed_at).not.toBeNull();
    expect(row.privacy_version).toBe(PRIVACY_CONSENT.version);
  });

  it("가입 중지(SIGNUP_MODE=closed)면 403", async () => {
    await freshEnv({ JEOMBOM_ENABLED: "false", SIGNUP_MODE: "closed" });
    const r = await signupRoute.POST(req("POST", { email: "c@example.test", password: "password-1234", passwordConfirm: "password-1234", displayName: "씨", agreePrivacy: true }), ctx());
    expect(r.status).toBe(403);
    expect((await r.json()).error.code).toBe("SIGNUP_CLOSED");
  });

  it("프로필 설정: 닉네임 변경, 출생 정보 저장 → 내 사주 지정, 변경 시 이전 내 사주 삭제", async () => {
    const u = await makeUser();
    loginAs(u.id);
    expect((await meRoute.PATCH(req("PATCH", { displayName: "바뀐이름" }), ctx())).status).toBe(200);
    expect((await (await meRoute.GET(req("GET"), ctx())).json()).user.displayName).toBe("바뀐이름");

    const first = await (await birthRoute.PUT(req("PUT", { birth }), ctx())).json();
    expect((await (await meRoute.GET(req("GET"), ctx())).json()).user.primaryCalculationId).toBe(first.calculationId);
    const second = await (await birthRoute.PUT(req("PUT", { birth: { ...birth, minute: 40 } }), ctx())).json();
    expect(second.calculationId).not.toBe(first.calculationId);
    const items = (await (await sajuRoute.GET(req("GET"), ctx())).json()).items.map((i: { id: string }) => i.id);
    expect(items).toEqual([second.calculationId]);
  });

  it("로그인 실패 메시지는 계정 존재 여부를 드러내지 않는다", async () => {
    const u = await makeUser();
    const wrongPw = await loginRoute.POST(req("POST", { email: u.email, password: "wrong" }), ctx());
    const noUser = await loginRoute.POST(req("POST", { email: "nobody@example.test", password: "wrong" }), ctx());
    expect(wrongPw.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect((await wrongPw.json()).error.message).toBe((await noUser.json()).error.message);
    const ok = await loginRoute.POST(req("POST", { email: u.email, password: "test-password-123" }), ctx());
    expect(ok.status).toBe(200);
  });

  it("관리자가 비활성화하면 로그인돼 있던 세션도 즉시 401", async () => {
    const admin = await makeUser("admin");
    const u = await makeUser();
    loginAs(admin.id);
    expect((await adminUsers.PATCH(req("PATCH", { status: "disabled" }), ctx({ id: u.id }))).status).toBe(200);
    loginAs(u.id);
    expect((await sajuRoute.GET(req("GET"), ctx())).status).toBe(401);
    const login = await loginRoute.POST(req("POST", { email: u.email, password: "test-password-123" }), ctx());
    expect(login.status).toBe(401);
  });

  it("계정 삭제: 비밀번호 확인 후 Auth 계정과 모든 데이터 삭제", async () => {
    const u = await makeUser();
    loginAs(u.id);
    await sajuRoute.POST(req("POST", { birth }), ctx());
    expect((await meRoute.POST(req("POST", { password: "wrong", confirm: "계정 삭제" }), ctx())).status).toBe(401);
    expect((await meRoute.POST(req("POST", { password: "test-password-123", confirm: "계정 삭제" }), ctx())).status).toBe(200);
    const pg = await rawPg();
    expect((await pg.query("select id from auth.users where id = $1", [u.id])).rows).toEqual([]);
    expect((await pg.query("select id from public.saju_calculations")).rows).toEqual([]);
  });

  it("크론 정리 API는 CRON_SECRET 없이는 401", async () => {
    process.env.CRON_SECRET = "test-cron-secret-value";
    expect((await cronRoute.GET(new Request(`${ORIGIN}/api/cron/purge`))).status).toBe(401);
    expect((await cronRoute.GET(new Request(`${ORIGIN}/api/cron/purge`, { headers: { authorization: "Bearer wrong-secret-value-xx" } }))).status).toBe(401);
    const ok = await cronRoute.GET(new Request(`${ORIGIN}/api/cron/purge`, { headers: { authorization: "Bearer test-cron-secret-value" } }));
    expect(ok.status).toBe(200);
    delete process.env.CRON_SECRET;
  });
});
