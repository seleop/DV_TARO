import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateDailyReading, generateSajuReading, latestSajuReading } from "@/lib/ai/interpret";
import { AnthropicProvider, setAiProviderForTests } from "@/lib/ai/provider";
import { getCalculation, saveCalculation } from "@/lib/repo/records";
import { parseBirthInput } from "@/lib/saju/input";
import { calculateSaju } from "@/lib/saju/service";
import { lunarJavascriptEngine } from "@/lib/saju/engines/lunar-javascript";
import { manseryeokEngine } from "@/lib/saju/engines/manseryeok";
import type { SajuEngine } from "@/lib/saju/engines/types";
import { freshEnv, makeUser, rawPg } from "./helpers/db";

/**
 * 실제 Anthropic SDK 호출 경로 (네트워크 대신 가짜 fetch).
 * API 키 없이도 요청 모양(모델·effort·대체 모델·구조화 출력)과 응답 처리(성공·거절·인증 오류)를 확인한다.
 */
const LOCAL = [manseryeokEngine, lunarJavascriptEngine] as SajuEngine[];

async function storedCalc(userId: string) {
  const input = parseBirthInput({ calendar: "solar", year: 1992, month: 10, day: 24, timeKnown: true, hour: 5, minute: 30, gender: "male" });
  const c = await calculateSaju(userId, input, { engines: LOCAL, jeombomEnabled: false });
  return (await getCalculation(userId, await saveCalculation(userId, input, c, null)))!;
}

type Sent = { url: string; headers: Headers; body: Record<string, unknown> };

/** Messages API 응답을 흉내 내는 fetch. reply 가 응답 본문(또는 오류)을 정한다 */
function fakeFetch(reply: (body: Record<string, unknown>) => { status?: number; json: unknown }) {
  const sent: Sent[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    sent.push({ url: String(input), headers: new Headers(init?.headers), body });
    const r = reply(body);
    return new Response(JSON.stringify(r.json), { status: r.status ?? 200, headers: { "content-type": "application/json", "request-id": "req_test" } });
  }) as typeof fetch;
  return { impl, sent };
}

const message = (data: unknown, extra: Record<string, unknown> = {}) => ({
  id: "msg_test",
  type: "message",
  role: "assistant",
  model: "claude-opus-5-5",
  content: [{ type: "text", text: JSON.stringify(data) }],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: { input_tokens: 1000, output_tokens: 2000 },
  ...extra,
});

const usageRows = async () => (await (await rawPg()).query<Record<string, unknown>>("select ok, error_code, model, cost_usd_est from public.usage_logs order by id")).rows;
const anthropic = (impl: typeof fetch) => new AnthropicProvider("sk-ant-test", "claude-opus-5-5", "medium", 10_000, 0, impl);

describe("실제 Claude 호출 경로 (가짜 네트워크)", () => {
  beforeEach(async () => freshEnv({ LIMIT_AI_PER_USER_PER_MINUTE: "20", LIMIT_AI_PER_USER_PER_DAY: "50", BUDGET_MONTHLY_USD: "20" }));
  afterEach(() => setAiProviderForTests(null));

  it("사주 풀이: Opus 5.5·effort·거절 시 대체 모델·구조화 출력으로 요청하고, 응답을 검사해 저장한다", async () => {
    const u = await makeUser();
    const calc = await storedCalc(u.id);
    // 모의 공급자가 만든 (스키마에 맞는) 풀이를 실제 API가 돌려준 것처럼 쓴다
    const sample = (await generateSajuReading(u.id, calc, { focus: [], targetYear: 2026 })).content;
    const { impl, sent } = fakeFetch(() => ({ json: message(sample) }));
    setAiProviderForTests(anthropic(impl));
    const r = await generateSajuReading(u.id, calc, { focus: [], targetYear: 2026 });

    expect(r.provider).toBe("anthropic");
    expect(r.content.dialogue?.beats.length).toBeGreaterThan(0);
    const req = sent[0];
    expect(req.url).toContain("/v1/messages");
    expect(req.headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    expect(req.body).toMatchObject({ model: "claude-opus-5-5", max_tokens: 16000, fallbacks: "default", output_config: { effort: "medium", format: { type: "json_schema" } } });
    expect(req.body).not.toHaveProperty("temperature");
    expect(req.body).not.toHaveProperty("thinking");
    // 출생 정보는 보내지 않는다
    expect(JSON.stringify(req.body)).not.toMatch(/1992|10월 24|05:30/);
    const last = (await usageRows()).at(-1)!;
    expect(last).toMatchObject({ ok: true, model: "claude-opus-5-5" });
    expect(Number(last.cost_usd_est)).toBeCloseTo((1000 * 4 + 2000 * 20) / 1e6, 6);
  });

  it("안전 분류기 거절로 대체 모델이 답하면 그 모델 단가로 비용을 기록한다", async () => {
    const u = await makeUser();
    const calc = await storedCalc(u.id);
    const sample = (await generateDailyReading(u.id, calc, { regenerate: false, now: new Date(Date.UTC(2024, 0, 1, 3)) })).reading.content;
    setAiProviderForTests(anthropic(fakeFetch(() => ({ json: message(sample, { model: "claude-opus-4-8" }) })).impl));
    await generateDailyReading(u.id, calc, { regenerate: true, now: new Date(Date.UTC(2024, 0, 1, 3)) });
    const last = (await usageRows()).at(-1)!;
    expect(last).toMatchObject({ ok: true, model: "claude-opus-4-8" });
    expect(Number(last.cost_usd_est)).toBeCloseTo((1000 * 5 + 2000 * 25) / 1e6, 6);
  });

  it("거절(대체 모델도 거절)·잘린 응답·인증 오류는 저장하지 않고 오류 코드로 남긴다", async () => {
    const u = await makeUser();
    const calc = await storedCalc(u.id);
    const run = () => generateSajuReading(u.id, calc, { focus: [], targetYear: 2026 });

    setAiProviderForTests(anthropic(fakeFetch(() => ({ json: message({}, { content: [], stop_reason: "refusal", stop_details: { type: "refusal", category: null, explanation: null } }) })).impl));
    await expect(run()).rejects.toMatchObject({ code: "AI_REFUSED" });

    setAiProviderForTests(anthropic(fakeFetch(() => ({ json: message({}, { content: [{ type: "text", text: "{\"summary\":" }], stop_reason: "max_tokens" }) })).impl));
    // 길이 제한으로 잘린 구조화 출력은 JSON이 끝나지 않아 SDK 해석 단계에서 실패한다 → 형식 오류로 기록
    await expect(run()).rejects.toMatchObject({ code: "AI_SCHEMA_INVALID" });

    setAiProviderForTests(anthropic(fakeFetch(() => ({ status: 401, json: { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } } })).impl));
    await expect(run()).rejects.toMatchObject({ code: "AI_CONFIG" });

    const rows = await usageRows();
    expect(rows.map((x) => x.error_code)).toEqual(["AI_REFUSED", "AI_SCHEMA_INVALID", "AI_CONFIG"]);
    expect((await (await rawPg()).query<{ c: number }>("select count(*)::int as c from public.fortune_readings")).rows[0].c).toBe(0);
  });

  it("실제 AI로 바꾼 뒤에는 모의 응답으로 저장된 오늘의 운세·사주 풀이를 다시 쓰지 않는다", async () => {
    const u = await makeUser();
    const calc = await storedCalc(u.id);
    const now = new Date(Date.UTC(2024, 0, 1, 3));
    const mockDaily = await generateDailyReading(u.id, calc, { regenerate: false, now });
    const mockSaju = await generateSajuReading(u.id, calc, { focus: [], targetYear: 2026 });
    expect(mockDaily.reading.provider).toBe("mock");

    setAiProviderForTests(anthropic(fakeFetch(() => ({ json: message(mockDaily.reading.content) })).impl));
    expect(await latestSajuReading(u.id, calc)).toBeNull(); // 화면에 '풀이 듣기'가 다시 나온다
    const real = await generateDailyReading(u.id, calc, { regenerate: false, now });
    expect(real.cached).toBe(false);
    expect(real.reading.provider).toBe("anthropic");
    // 실제 AI 결과는 같은 날 다시 쓴다
    expect((await generateDailyReading(u.id, calc, { regenerate: false, now })).cached).toBe(true);
    void mockSaju;
  });
});
