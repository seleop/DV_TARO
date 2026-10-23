import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * 점봄 API 모의 fetch.
 * tests/fixtures/jeombom/*.json 은 2026-10-23 실제 API(https://jeombom.kr/api/manse)에서 기록한 응답이다.
 * 픽스처에 없는 요청은 404를 돌려 테스트가 의도치 않은 호출을 하면 드러나게 한다.
 */
const DIR = path.resolve(import.meta.dirname, "../fixtures/jeombom");

const INDEX: Array<{ match: Record<string, string>; file: string }> = [
  { match: { year: "1992", month: "10", day: "24", hour: "5", minute: "30", calendar: "solar" }, file: "s19921024_0530_m" },
  { match: { year: "2024", month: "1", day: "1", hour: "12", minute: "0", calendar: "solar" }, file: "s20240101_1200" },
  { match: { year: "1990", month: "5", day: "15", hour: "14", minute: "30", calendar: "solar" }, file: "s19900515_1430_m" },
  { match: { year: "2024", month: "2", day: "4", hour: "17", minute: "0", calendar: "solar" }, file: "s20240204_1700" },
  { match: { year: "2024", month: "2", day: "4", hour: "17", minute: "30", calendar: "solar" }, file: "s20240204_1730" },
  { match: { year: "2024", month: "3", day: "10", hour: "23", minute: "30", calendar: "solar" }, file: "s20240310_2330" },
  { match: { year: "1997", month: "1", day: "1", calendar: "lunar", leap: "0" }, file: "l19970101" },
  { match: { year: "2020", month: "4", day: "1", calendar: "lunar", leap: "1" }, file: "l20200401_leap" },
];

export function loadFixture(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(DIR, `${name}.json`), "utf8"));
}

export interface MockFetchOptions {
  /** 응답을 가공해 불일치·오류 상황을 만든다 */
  transform?: (body: Record<string, unknown>, params: URLSearchParams) => Record<string, unknown>;
  /** 특정 호출 번호(0부터)에서 강제로 실패시킨다 */
  failOn?: (callIndex: number) => "timeout" | "500" | "429" | "network" | null;
}

export function createJeombomMock(opts: MockFetchOptions = {}) {
  const calls: URLSearchParams[] = [];
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const params = url.searchParams;
    const idx = calls.length;
    calls.push(params);
    const failure = opts.failOn?.(idx) ?? null;
    if (failure === "timeout") {
      // 요청 signal이 abort될 때까지 응답하지 않는다.
      await new Promise((_, reject) => {
        const s = init?.signal;
        if (!s) return;
        s.addEventListener("abort", () => reject(s.reason ?? Object.assign(new Error("aborted"), { name: "AbortError" })));
      });
    }
    if (failure === "network") throw new TypeError("fetch failed");
    if (failure === "500") return new Response("{}", { status: 500 });
    if (failure === "429") return new Response("{}", { status: 429 });
    const entry = INDEX.find((e) => Object.entries(e.match).every(([k, v]) => params.get(k) === v));
    if (!entry) return new Response(JSON.stringify({ ok: false, error: { code: 404 } }), { status: 404 });
    let body = loadFixture(entry.file);
    if (opts.transform) body = opts.transform(structuredClone(body), params);
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { fetch: impl, calls };
}
