import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteAllUserRecords,
  deleteCalculation,
  deleteReading,
  findCalculationIdByCacheKey,
  getCalculation,
  getReading,
  listCalculations,
  listReadings,
  saveCalculation,
  saveReading,
} from "@/lib/repo/records";
import { AuthError, createInvitation, deleteUser, getProfile, listInvitations, promoteIfConfiguredAdmin, revokeInvitation, signUp } from "@/lib/repo/users";
import { resetConfigForTests } from "@/lib/config";
import { parseBirthInput } from "@/lib/saju/input";
import { calculateSaju } from "@/lib/saju/service";
import { lunarJavascriptEngine } from "@/lib/saju/engines/lunar-javascript";
import { manseryeokEngine } from "@/lib/saju/engines/manseryeok";
import type { SajuEngine } from "@/lib/saju/engines/types";
import { fakeAuthAdmin, freshEnv, makeUser, rawPg } from "./helpers/db";

const LOCAL = [manseryeokEngine, lunarJavascriptEngine] as SajuEngine[];
const input = parseBirthInput({ calendar: "solar", year: 1992, month: 10, day: 24, timeKnown: true, hour: 5, minute: 30, gender: "female" });

async function makeCalc(userId: string, label = "나") {
  const c = await calculateSaju(userId, input, { engines: LOCAL, jeombomEnabled: false });
  return { id: await saveCalculation(userId, input, c, label), cacheKey: c.cacheKey };
}
const count = async (t: string) => ((await (await rawPg()).query<{ c: number }>(`select count(*)::int as c from ${t}`)).rows[0].c);

describe("회원가입", () => {
  beforeEach(() => freshEnv());
  const signupInput = (email: string, displayName = "닉네임") => ({ email, password: "password-1234", displayName });

  it("이메일·비밀번호·닉네임으로 가입하고 이메일은 소문자로 저장한다", async () => {
    const u = await signUp(fakeAuthAdmin, signupInput("Hello@Example.test", "헬로"));
    expect(u).toMatchObject({ email: "hello@example.test", displayName: "헬로", role: "user" });
    expect((await getProfile(u.id))?.email).toBe("hello@example.test");
  });

  it("이미 있는 이메일이면 EMAIL_TAKEN", async () => {
    await signUp(fakeAuthAdmin, signupInput("dup@example.test"));
    await expect(signUp(fakeAuthAdmin, signupInput("dup@example.test"))).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("ADMIN_EMAILS에 있는 이메일은 관리자로 가입되고, 이미 가입한 사용자는 로그인 시 승격된다", async () => {
    const before = await signUp(fakeAuthAdmin, signupInput("boss@example.test"));
    expect(before.role).toBe("user");
    // DB는 그대로 두고 설정만 다시 읽는다
    process.env.ADMIN_EMAILS = "boss@example.test, owner@example.test";
    resetConfigForTests();
    expect((await promoteIfConfiguredAdmin((await getProfile(before.id))!)).role).toBe("admin");
    expect((await getProfile(before.id))?.role).toBe("admin");
    const owner = await signUp(fakeAuthAdmin, signupInput("Owner@example.test"));
    expect(owner.role).toBe("admin");
  });

  it("SIGNUP_MODE=closed 이면 가입을 막는다", async () => {
    await freshEnv({ SIGNUP_MODE: "closed" });
    await expect(signUp(fakeAuthAdmin, signupInput("x@example.test"))).rejects.toMatchObject({ code: "SIGNUP_CLOSED" });
  });

  describe("SIGNUP_MODE=invite", () => {
    beforeEach(() => freshEnv({ SIGNUP_MODE: "invite" }));

    it("초대 코드가 필요하고 한 번만 쓸 수 있으며, DB에는 해시만 저장된다", async () => {
      await expect(signUp(fakeAuthAdmin, signupInput("a@example.test"))).rejects.toMatchObject({ code: "INVALID_INVITE" });
      const inv = await createInvitation(null, "user", "테스트");
      const row = (await (await rawPg()).query<{ code_hash: string }>("select code_hash from public.invitations where id = $1", [inv.id])).rows[0];
      expect(row.code_hash).not.toContain(inv.code.replace(/-/g, ""));
      await signUp(fakeAuthAdmin, { ...signupInput("a@example.test", "에이"), inviteCode: inv.code.toLowerCase() });
      await expect(signUp(fakeAuthAdmin, { ...signupInput("b@example.test"), inviteCode: inv.code })).rejects.toMatchObject({ code: "INVALID_INVITE" });
      expect((await listInvitations())[0]).toMatchObject({ state: "used", used_by_name: "에이" });
    });

    it("취소·만료된 초대는 거부한다", async () => {
      const admin = await makeUserWithInvite("admin");
      const inv = await createInvitation(admin.id, "user", null);
      await revokeInvitation(admin.id, inv.id);
      await expect(signUp(fakeAuthAdmin, { ...signupInput("c@example.test"), inviteCode: inv.code })).rejects.toBeInstanceOf(AuthError);
      const old = await createInvitation(null, "user", null, -1);
      await expect(signUp(fakeAuthAdmin, { ...signupInput("d@example.test"), inviteCode: old.code })).rejects.toMatchObject({ code: "INVALID_INVITE" });
    });

    it("가입이 실패하면(중복 이메일) 초대 코드를 다시 쓸 수 있게 되돌린다", async () => {
      const first = await createInvitation(null, "user", null);
      await signUp(fakeAuthAdmin, { ...signupInput("dup@example.test"), inviteCode: first.code });
      const inv2 = await createInvitation(null, "user", null);
      await expect(signUp(fakeAuthAdmin, { ...signupInput("dup@example.test"), inviteCode: inv2.code })).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
      const u = await signUp(fakeAuthAdmin, { ...signupInput("new@example.test"), inviteCode: inv2.code });
      expect(u.role).toBe("user");
    });

    it("관리자 초대로 가입하면 관리자 권한", async () => {
      expect((await makeUserWithInvite("admin")).role).toBe("admin");
    });
  });
});

let inviteSeq = 0;
async function makeUserWithInvite(role: "user" | "admin") {
  inviteSeq += 1;
  const inv = await createInvitation(null, role, null);
  return signUp(fakeAuthAdmin, { email: `invited${inviteSeq}@example.test`, password: "password-1234", displayName: "초대", inviteCode: inv.code });
}

describe("사용자별 기록 접근 제한", () => {
  beforeEach(() => freshEnv());

  it("본인 기록은 조회되고, 다른 사용자의 기록은 조회·삭제할 수 없다", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const { id } = await makeCalc(alice.id);
    expect((await getCalculation(alice.id, id))?.label).toBe("나");
    expect(await getCalculation(bob.id, id)).toBeNull();
    expect(await listCalculations(bob.id)).toEqual([]);
    expect(await deleteCalculation(bob.id, id)).toBe(false);
    expect(await getCalculation(alice.id, id)).not.toBeNull();

    const rid = await saveReading(alice.id, { kind: "tarot", calculationId: null, cacheKey: null, provider: "mock", model: "mock", promptVersion: "t", content: { q: "비밀 질문" } });
    expect(await getReading(bob.id, rid)).toBeNull();
    expect(await deleteReading(bob.id, rid)).toBe(false);
    expect(await listReadings(bob.id, ["tarot"])).toEqual([]);
    expect((await getReading<{ q: string }>(alice.id, rid))?.content.q).toBe("비밀 질문");
  });

  it("잘못된 형식의 ID는 DB 오류 없이 '없음'으로 처리", async () => {
    const u = await makeUser();
    expect(await getCalculation(u.id, "not-a-uuid")).toBeNull();
    expect(await deleteReading(u.id, "1 or 1=1")).toBe(false);
  });

  it("출생 정보·라벨·결과·운세 내용은 DB에 평문으로 저장되지 않는다", async () => {
    const u = await makeUser();
    const { id } = await makeCalc(u.id, "엄마");
    await saveReading(u.id, { kind: "saju", calculationId: id, cacheKey: null, provider: "mock", model: "mock", promptVersion: "s", content: { summary: "비밀해석문장" } });
    const pg = await rawPg();
    const dump = JSON.stringify([
      (await pg.query("select * from public.saju_calculations")).rows,
      (await pg.query("select * from public.saju_engine_results")).rows,
      (await pg.query("select * from public.fortune_readings")).rows,
    ]);
    for (const secret of ["1992", "엄마", "계유", "비밀해석문장", "\"hour\":5"]) expect(dump).not.toContain(secret);
  });
});

describe("삭제와 캐시", () => {
  beforeEach(() => freshEnv());

  it("계산 삭제 시 엔진 결과·연결된 운세가 함께 삭제되고, 캐시 키로도 더 이상 찾을 수 없다", async () => {
    const u = await makeUser();
    const { id, cacheKey } = await makeCalc(u.id);
    await saveReading(u.id, { kind: "saju", calculationId: id, cacheKey: null, provider: "mock", model: "mock", promptVersion: "s", content: {} });
    expect(await findCalculationIdByCacheKey(u.id, cacheKey)).toBe(id);
    expect(await deleteCalculation(u.id, id)).toBe(true);
    expect(await findCalculationIdByCacheKey(u.id, cacheKey)).toBeNull();
    expect([await count("public.saju_calculations"), await count("public.saju_engine_results"), await count("public.fortune_readings")]).toEqual([0, 0, 0]);
  });

  it("전체 기록 삭제는 본인 기록만 지우고 다른 사용자 기록은 남긴다", async () => {
    const a = await makeUser();
    const b = await makeUser();
    await makeCalc(a.id);
    await makeCalc(b.id);
    await saveReading(a.id, { kind: "tarot", calculationId: null, cacheKey: null, provider: "mock", model: "mock", promptVersion: "t", content: {} });
    expect(await deleteAllUserRecords(a.id)).toEqual({ calculations: 1, readings: 1 });
    expect(await listCalculations(a.id)).toEqual([]);
    expect(await listCalculations(b.id)).toHaveLength(1);
  });

  it("계정 삭제 시 프로필·계산·운세가 CASCADE로 삭제된다", async () => {
    const u = await makeUser();
    await makeCalc(u.id);
    await deleteUser(fakeAuthAdmin, u.id);
    for (const t of ["auth.users", "public.profiles", "public.saju_calculations", "public.saju_engine_results", "public.fortune_readings"]) {
      expect({ t, c: await count(t) }).toEqual({ t, c: 0 });
    }
  });

  it("같은 사용자의 같은 입력은 한 번만 저장된다 (캐시 키 기준)", async () => {
    const u = await makeUser();
    const first = await makeCalc(u.id);
    const second = await makeCalc(u.id, "다시");
    expect(second.id).toBe(first.id);
    expect(await listCalculations(u.id)).toHaveLength(1);
    expect((await getCalculation(u.id, first.id))?.label).toBe("다시");
  });

  it("같은 입력이라도 사용자가 다르면 캐시를 공유하지 않는다", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const x = await makeCalc(a.id);
    const y = await makeCalc(b.id);
    expect(x.cacheKey).not.toBe(y.cacheKey);
  });
});
