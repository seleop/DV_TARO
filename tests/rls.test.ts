import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { saveCalculation, saveReading } from "@/lib/repo/records";
import { getOwnProfileViaRls, setPrimaryCalculation, setUserStatus } from "@/lib/repo/users";
import { parseBirthInput } from "@/lib/saju/input";
import { calculateSaju } from "@/lib/saju/service";
import { lunarJavascriptEngine } from "@/lib/saju/engines/lunar-javascript";
import { manseryeokEngine } from "@/lib/saju/engines/manseryeok";
import type { SajuEngine } from "@/lib/saju/engines/types";
import { fakeAuthAdmin, freshEnv, makeUser, rawPg } from "./helpers/db";

/**
 * Supabase RLS 정책 직접 검증.
 * 애플리케이션 코드를 거치지 않고 raw SQL을 authenticated/anon 역할로 실행해,
 * 서버 코드에 실수가 있어도 DB가 다른 사용자의 행을 막는지 확인한다.
 */
const LOCAL = [manseryeokEngine, lunarJavascriptEngine] as SajuEngine[];
const input = parseBirthInput({ calendar: "solar", year: 1992, month: 10, day: 24, timeKnown: true, hour: 5, minute: 30 });

async function makeCalc(userId: string) {
  const c = await calculateSaju(userId, input, { engines: LOCAL, jeombomEnabled: false });
  return saveCalculation(userId, input, c, "나");
}

/** raw SQL을 특정 사용자(또는 anon)로 실행 */
async function as<T = Record<string, unknown>>(pg: PGlite, who: string | "anon", sql: string, params: unknown[] = []): Promise<T[]> {
  return pg.transaction(async (tx) => {
    if (who === "anon") await tx.query("set local role anon");
    else {
      await tx.query("set local role authenticated");
      await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: who, role: "authenticated" })]);
    }
    return (await tx.query<T>(sql, params)).rows;
  });
}

describe("RLS 정책 (실제 마이그레이션 SQL)", () => {
  let pg: PGlite;
  beforeEach(async () => {
    await freshEnv({ JEOMBOM_ENABLED: "false" });
    pg = await rawPg();
  });

  it("조건 없이 전체 조회해도 본인 행만 보인다", async () => {
    const a = await makeUser();
    const b = await makeUser();
    await makeCalc(a.id);
    await makeCalc(b.id);
    const seenByA = await as<{ user_id: string }>(pg, a.id, "select user_id from public.saju_calculations");
    expect(seenByA.map((r) => r.user_id)).toEqual([a.id]);
    const engines = await as<{ user_id: string }>(pg, a.id, "select user_id from public.saju_engine_results");
    expect(engines.length).toBeGreaterThan(0);
    expect(new Set(engines.map((r) => r.user_id))).toEqual(new Set([a.id]));
    expect(await getOwnProfileViaRls(a.id)).toEqual([{ id: a.id, display_name: a.displayName }]);
  });

  it("다른 사용자의 행을 수정·삭제할 수 없다 (0행 처리)", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const bCalc = await makeCalc(b.id);
    expect(await as(pg, a.id, "delete from public.saju_calculations where id = $1 returning id", [bCalc])).toEqual([]);
    expect(await as(pg, a.id, "update public.saju_calculations set label_enc = 'x' where id = $1 returning id", [bCalc])).toEqual([]);
    const still = await pg.query("select id from public.saju_calculations where id = $1", [bCalc]);
    expect(still.rows).toHaveLength(1);
  });

  it("다른 사용자 명의로 행을 넣을 수 없다", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const bCalc = await makeCalc(b.id);
    await expect(
      as(pg, a.id, "insert into public.saju_calculations (user_id, cache_key, input_enc, result_enc, status, rules_version) values ($1,'k','x','x','MATCH','r')", [b.id]),
    ).rejects.toThrow(/row-level security/);
    // 본인 명의라도 남의 계산에 엔진 결과·운세를 붙일 수 없다
    await expect(
      as(pg, a.id, "insert into public.saju_engine_results (calculation_id, user_id, engine, engine_version, ok, duration_ms, field_status) values ($1,$2,'e','1',true,1,'{}')", [bCalc, a.id]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(pg, a.id, "insert into public.fortune_readings (user_id, calculation_id, kind, provider, model, prompt_version, content_enc) values ($1,$2,'saju','m','m','v','x')", [a.id, bCalc]),
    ).rejects.toThrow(/row-level security/);
  });

  it("초대·사용량·감사 로그와 다른 사람 프로필은 사용자 권한으로 읽을 수 없다", async () => {
    const a = await makeUser();
    const b = await makeUser();
    await expect(as(pg, a.id, "select * from public.invitations")).rejects.toThrow(/permission denied/);
    await expect(as(pg, a.id, "select * from public.usage_logs")).rejects.toThrow(/permission denied/);
    await expect(as(pg, a.id, "select * from public.admin_audit")).rejects.toThrow(/permission denied/);
    expect(await as(pg, a.id, "select id from public.profiles where id = $1", [b.id])).toEqual([]);
    // 자기 역할을 admin으로 올릴 수 없다 (profiles 쓰기 권한 없음)
    await expect(as(pg, a.id, "update public.profiles set role = 'admin' where id = $1", [a.id])).rejects.toThrow(/permission denied/);
  });

  it("비로그인(anon)은 어떤 테이블도 읽을 수 없다", async () => {
    for (const t of ["profiles", "invitations", "saju_calculations", "saju_engine_results", "fortune_readings", "usage_logs", "admin_audit"]) {
      await expect(as(pg, "anon", `select * from public.${t}`)).rejects.toThrow(/permission denied/);
    }
  });

  it("비활성화된 사용자는 자기 기록도 읽을 수 없다", async () => {
    const admin = await makeUser("admin");
    const u = await makeUser();
    await makeCalc(u.id);
    await setUserStatus(fakeAuthAdmin, admin.id, u.id, "disabled");
    expect(fakeAuthAdmin.banned.has(u.id)).toBe(true);
    expect(await as(pg, u.id, "select id from public.saju_calculations")).toEqual([]);
  });

  it("대표 사주를 삭제하면 지정이 해제된다 (FK on delete set null, 사용자 권한 삭제)", async () => {
    const u = await makeUser();
    const id = await makeCalc(u.id);
    expect(await setPrimaryCalculation(u.id, id)).toBe(true);
    await saveReading(u.id, { kind: "saju", calculationId: id, cacheKey: null, provider: "mock", model: "mock", promptVersion: "v", content: {} });
    await as(pg, u.id, "delete from public.saju_calculations where id = $1", [id]);
    const p = await pg.query<{ primary_calculation_id: string | null }>("select primary_calculation_id from public.profiles where id = $1", [u.id]);
    expect(p.rows[0].primary_calculation_id).toBeNull();
    const left = await pg.query("select id from public.fortune_readings where user_id = $1", [u.id]);
    expect(left.rows).toEqual([]);
  });

  it("남의 계산을 대표 사주로 지정할 수 없다", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const bCalc = await makeCalc(b.id);
    expect(await setPrimaryCalculation(a.id, bCalc)).toBe(false);
  });
});
