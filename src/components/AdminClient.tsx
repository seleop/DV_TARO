"use client";

import { SafeForm } from "./SafeForm";
import { useCallback, useEffect, useState } from "react";
import { api, errorText, formatDate } from "@/lib/client";
import { Paged, Pager } from "./app/Screen";
import { Button, Card, ErrorBox, Field, H2, inputCls } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any -- 관리자 화면은 서버 집계 JSON을 그대로 표시한다 */

const TABS = [
  { id: "stats", label: "사용량·비용" },
  { id: "engines", label: "엔진 검증" },
  { id: "check", label: "엔진 진단" },
  { id: "users", label: "사용자·초대" },
] as const;

const usd = (n: number) => `$${(n ?? 0).toFixed(4)}`;
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");

/** 스크롤 없이: 탭마다 카드를 장으로 나눠 좌우로 넘기고, 표·목록은 카드 안에서 쪽(‹ 1/3 ›)으로 넘긴다 */
export function AdminClient({ adminId }: { adminId: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("stats");
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 pb-3">
      <p className="shrink-0 text-xs text-ink-2">집계와 오류 진단 정보만 표시됩니다. 개인의 사주·질문·해석 내용은 볼 수 없습니다.</p>
      <div className="grid shrink-0 grid-cols-4 gap-1 rounded-2xl bg-tile p-1 text-[13px]" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-1 py-2 font-semibold leading-tight ${tab === t.id ? "bg-white text-[#2a2440]" : "text-ink-2"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "stats" && <Stats />}
      {tab === "engines" && <EngineReport />}
      {tab === "check" && <EngineCheck />}
      {tab === "users" && <Users adminId={adminId} />}
    </div>
  );
}

function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    api<T>(path)
      .then(setData)
      .catch((e) => setError(errorText(e)));
  }, [path]);
  useEffect(reload, [reload]);
  return { data, error, reload };
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-tile p-3">
      <div className="text-xs text-ink-2">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-ink-2">{sub}</div>}
    </div>
  );
}

function Stats() {
  const [days, setDays] = useState(30);
  const { data, error } = useLoad<any>(`/api/admin/stats?days=${days}`);
  if (error) return <ErrorBox message={error} />;
  if (!data) return <p className="text-sm text-ink-2">불러오는 중…</p>;
  const t = data.ai.totals;
  const period = `최근 ${days}일`;
  return (
    <Pager labels={["이번 달 예산", "AI 호출", "모델·프롬프트별", "일별", "오류 코드", "버전 정보", "계산 엔진"]}>
      <Card>
        <H2 sub="비용은 토큰 수 × 공개 단가로 계산한 추정치입니다. 실제 청구액과 다를 수 있습니다.">이번 달 예산</H2>
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label="월 예산" value={`$${data.budget.monthlyBudgetUsd}`} />
          <Stat label="사용(추정)" value={usd(data.budget.spentUsdEst)} sub={pct(data.budget.spentUsdEst, data.budget.monthlyBudgetUsd)} />
          <Stat label="남음(추정)" value={usd(data.budget.remainingUsdEst)} />
        </div>
      </Card>
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold">AI 호출</h2>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="ml-auto rounded-lg border border-line bg-surface px-2 py-1 text-sm">
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>
                최근 {d}일
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label="호출" value={String(t.calls ?? 0)} sub={`성공률 ${pct(t.ok_calls ?? 0, t.calls ?? 0)}`} />
          <Stat label="이용자 수" value={String(t.users ?? 0)} />
          <Stat label="토큰(입력/출력)" value={`${(t.input_tokens ?? 0).toLocaleString()} / ${(t.output_tokens ?? 0).toLocaleString()}`} />
          <Stat label="비용(추정)" value={usd(t.cost)} sub={`평균 ${Math.round(t.avg_ms ?? 0)}ms`} />
        </div>
      </Card>
      <Card>
        <H2 sub={period}>모델·프롬프트 버전별</H2>
        <SimpleTable rows={data.ai.byModel} cols={[["provider", "공급자"], ["model", "모델"], ["prompt_version", "프롬프트"], ["calls", "호출"], ["cost", "비용(추정)", usd]]} />
      </Card>
      <Card>
        <H2 sub={period}>일별</H2>
        <SimpleTable rows={data.ai.daily} cols={[["day", "날짜"], ["calls", "호출"], ["cost", "비용(추정)", usd]]} />
      </Card>
      <Card>
        <H2 sub={period}>오류 코드</H2>
        <SimpleTable rows={data.ai.errors} cols={[["kind", "종류"], ["error_code", "코드"], ["n", "건수"], ["last_at", "최근", (v: number) => formatDate(v)]]} />
      </Card>
      <Card>
        <H2>버전 정보</H2>
        <dl className="grid gap-2 text-[13px]">
          <div>
            <dt className="text-ink-2">AI</dt>
            <dd>
              {data.versions.aiProvider} / {data.versions.aiModel} (effort {data.versions.aiEffort})
              {data.versions.pricing ? ` — 입력 $${data.versions.pricing.input}/출력 $${data.versions.pricing.output} per 1M tokens` : " — 단가 미등록(보수적 추정)"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-2">검증 규칙</dt>
            <dd>{data.versions.verifyRules}</dd>
          </div>
          <div>
            <dt className="text-ink-2">프롬프트</dt>
            <dd>{Object.entries(data.versions.prompts).map(([k, v]) => `${k}: ${v}`).join(" · ")}</dd>
          </div>
          <div>
            <dt className="text-ink-2">호출 제한</dt>
            <dd>
              AI 사용자당 {data.limits.aiPerUserPerMinute}회/분, {data.limits.aiPerUserPerDay}회/일 · 사주 계산 {data.limits.calcPerUserPerDay}회/일
            </dd>
          </div>
        </dl>
      </Card>
      <Card>
        <H2>계산 엔진</H2>
        <ul className="space-y-2 text-[13px]">
          {data.versions.engines.map((e: any) => (
            <li key={e.id}>
              {e.name} <b>{e.version}</b> ({e.license}, {e.kind === "remote-api" ? "외부 API" : "로컬 라이브러리"}) — {e.basis}
            </li>
          ))}
        </ul>
      </Card>
    </Pager>
  );
}

/** 표: 화면 폭 안에 맞추고(가로 스크롤 없음), 줄이 많으면 쪽으로 넘긴다 */
function SimpleTable({ rows, cols }: { rows: any[]; cols: Array<[string, string, ((v: any) => string)?]> }) {
  return (
    <Paged items={rows ?? []} per={8}>
      {(slice) => (
        <table className="w-full table-fixed break-words text-left text-xs">
          <thead className="text-ink-2">
            <tr>
              {cols.map(([k, l]) => (
                <th key={k} className="py-1 pr-2 font-normal">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={i} className="border-t border-line">
                {cols.map(([k, , f]) => (
                  <td key={k} className="py-1.5 pr-2 align-top tabular-nums">
                    {f ? f(r[k]) : String(r[k] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Paged>
  );
}

function EngineReport() {
  const stats = useLoad<any>("/api/admin/stats?days=90");
  const issues = useLoad<{ items: any[] }>("/api/admin/issues");
  if (stats.error || issues.error) return <ErrorBox message={stats.error ?? issues.error} />;
  if (!stats.data || !issues.data) return <p className="text-sm text-ink-2">불러오는 중…</p>;
  const e = stats.data.engines;
  const total = e.statuses.reduce((a: number, s: any) => a + s.n, 0);
  return (
    <Pager labels={["검증 결과 분포", "엔진별 성공률", "엔진 오류", "실패·조건부 사례"]}>
      <Card>
        <H2 sub="최근 90일">검증 결과 분포</H2>
        <div className="grid grid-cols-2 gap-2.5">
          {["MATCH", "CONDITIONAL_MATCH", "MISMATCH", "UNVERIFIABLE"].map((s) => {
            const n = e.statuses.find((x: any) => x.status === s)?.n ?? 0;
            return <Stat key={s} label={s} value={String(n)} sub={pct(n, total)} />;
          })}
        </div>
      </Card>
      <Card>
        <H2 sub="불일치율 = 비교에 참여한 필드 중 최종 확정값과 다르거나 불일치로 판정된 비율">엔진별 성공률·불일치율</H2>
        <SimpleTable
          rows={e.perEngine.map((p: any) => ({
            ...p,
            success: pct(p.ok_runs, p.runs),
            disagree: e.disagreement[p.engine] ? pct(e.disagreement[p.engine].disagreed, e.disagreement[p.engine].compared) : "—",
          }))}
          cols={[["engine", "엔진"], ["engine_version", "버전"], ["runs", "실행"], ["success", "성공률"], ["disagree", "불일치율"], ["avg_ms", "평균 ms", (v) => String(Math.round(v))]]}
        />
      </Card>
      <Card>
        <H2 sub="최근 90일">엔진 오류</H2>
        <SimpleTable rows={e.engineErrors} cols={[["engine", "엔진"], ["error_code", "코드"], ["n", "건수"], ["last_at", "최근", (v: number) => formatDate(v)]]} />
      </Card>
      <Card>
        <H2 sub="사용자·출생 정보·간지 값 없이 판정 상태와 원인만 표시합니다.">최근 검증 실패·조건부 사례</H2>
        <Paged items={issues.data.items} per={2} empty="없음">
          {(slice) => (
            <ul className="space-y-3 text-sm">
              {slice.map((it) => (
                <li key={it.ref} className="rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{it.status}</b>
                    <span className="text-ink-2">#{it.ref}</span>
                    <span className="text-ink-2">{formatDate(it.createdAt)}</span>
                    <span className="text-xs text-ink-2">규칙 {it.rulesVersion}</span>
                  </div>
                  <p className="mt-1">원인: {it.reasons.join(", ") || "—"}</p>
                  <p className="text-xs text-ink-2">
                    설정: {it.settings.calendar}, 윤달 {String(it.settings.leap)}, 시간 {it.settings.timeKnown ? "있음" : "미상"}, 자시 {it.settings.dayBoundary}, 보정 {it.settings.correction}
                  </p>
                  <ul className="mt-2 grid gap-1">
                    {it.engines.map((en: any) => (
                      <li key={en.engine} className="text-xs">
                        <span className={en.ok ? "text-ok" : "text-bad"}>{en.ok ? "●" : "○"}</span> {en.engine}
                        {en.errorCode ? ` (${en.errorCode})` : ""} —{" "}
                        {Object.entries(en.fields)
                          .map(([f, v]: [string, any]) => `${f}:${v.compared ? (v.agreesWithFinal ? "일치" : v.status) : (v.excludedReason ?? "-")}`)
                          .join(" ")}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Paged>
      </Card>
    </Pager>
  );
}

function EngineCheck() {
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const [y, m, d] = String(f.get("date")).split("-").map(Number);
    const time = String(f.get("time") || "");
    const [hh, mm] = time ? time.split(":").map(Number) : [null, null];
    setBusy(true);
    setError(null);
    try {
      setResult(
        await api("/api/admin/engine-check", {
          body: {
            birth: {
              calendar: f.get("calendar"),
              year: y,
              month: m,
              day: d,
              isLeapMonth: f.get("leap") === "on",
              timeKnown: !!time,
              hour: hh,
              minute: mm,
              gender: f.get("gender") || null,
              settings: { correction: "none", dayBoundary: f.get("dayBoundary"), applyHistoricalOffset: true },
            },
          },
        }),
      );
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Pager labels={result ? ["엔진 진단 입력", "판정", "상세 결과"] : ["엔진 진단 입력"]}>
      <Card>
        <H2 sub="테스트용 날짜로 모든 엔진을 실행해 비교합니다. 결과는 저장되지 않습니다.">엔진 진단</H2>
        <SafeForm onSubmit={onSubmit} className="grid grid-cols-2 gap-2.5">
          <Field label="달력">
            <select name="calendar" className={inputCls}>
              <option value="solar">양력</option>
              <option value="lunar">음력</option>
            </select>
          </Field>
          <Field label="날짜">
            <input name="date" type="date" required className={inputCls} />
          </Field>
          <Field label="시각(비우면 미상)">
            <input name="time" type="time" className={inputCls} />
          </Field>
          <Field label="자시 처리">
            <select name="dayBoundary" className={inputCls}>
              <option value="midnight">midnight</option>
              <option value="jasi">jasi</option>
              <option value="splitJasi">splitJasi</option>
            </select>
          </Field>
          <Field label="성별">
            <select name="gender" className={inputCls}>
              <option value="">-</option>
              <option value="male">남</option>
              <option value="female">여</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm">
            <input type="checkbox" name="leap" /> 윤달
          </label>
          <div className="col-span-2">
            <Button type="submit" loading={busy} className="w-full">
              실행
            </Button>
          </div>
        </SafeForm>
        <div className="mt-3">
          <ErrorBox message={error} />
          {result && <p className="text-xs text-ink-2">결과가 나왔어요. 옆으로 넘겨 보세요 ›</p>}
        </div>
      </Card>
      {result && (
        <Card>
          <H2 sub={result.reasons.join(", ")}>판정: {result.status}</H2>
          <table className="w-full table-fixed break-words text-left text-xs">
            <thead className="text-ink-2">
              <tr>
                <th className="py-1 pr-2 font-normal">항목</th>
                {result.engines.map((e: any) => (
                  <th key={e.engine} className="py-1 pr-2 font-normal">
                    {e.engine}
                  </th>
                ))}
                <th className="py-1 font-normal">판정</th>
              </tr>
            </thead>
            <tbody>
              {["year", "month", "day", "hour"].map((f) => (
                <tr key={f} className="border-t border-line">
                  <td className="py-1.5 pr-2">{f}</td>
                  {result.engines.map((e: any) => (
                    <td key={e.engine} className="py-1.5 pr-2">
                      {result.fields[f].values[e.engine] ?? "—"}
                    </td>
                  ))}
                  <td className="py-1.5">{result.fields[f].status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {result && (
        <Card className="flex min-h-0 flex-1 flex-col">
          <H2 sub="개발 진단용 원본 값 (이 칸만 안에서 스크롤)">상세 결과</H2>
          <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-2xl bg-black/30 p-3 text-[10px]">
            {JSON.stringify(
              {
                engines: result.engines,
                daewoon: result.daewoon,
                tenGods: result.tenGods,
                outcomes: result.outcomes,
                time: result.time,
                lunar: result.lunar,
                resolutionLog: result.resolutionLog,
                warnings: result.warnings,
                interpretive: result.interpretiveDifferences,
              },
              null,
              2,
            )}
          </pre>
        </Card>
      )}
    </Pager>
  );
}

function Users({ adminId }: { adminId: string }) {
  const users = useLoad<{ items: any[] }>("/api/admin/users");
  const invites = useLoad<{ items: any[] }>("/api/admin/invitations");
  const [created, setCreated] = useState<{ code: string; expiresAt: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      users.reload();
      invites.reload();
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <ErrorBox message={error ?? users.error ?? invites.error} />
      <Pager labels={["초대 코드 만들기", "초대 목록", "사용자"]}>
        <Card>
          <H2 sub="코드는 생성 직후 한 번만 보여 줍니다. 서버에는 해시만 저장돼요.">초대 코드 만들기</H2>
          <SafeForm
            className="grid grid-cols-2 items-end gap-2.5"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              await act(async () => {
                const r = await api<{ invitation: { code: string; expiresAt: number } }>("/api/admin/invitations", {
                  body: { role: f.get("role"), memo: (f.get("memo") as string) || null, ttlDays: Number(f.get("ttl")) },
                });
                setCreated(r.invitation);
              });
              setBusy(false);
            }}
          >
            <div className="col-span-2">
              <Field label="메모(누구에게 줄지)">
                <input name="memo" maxLength={40} className={inputCls} />
              </Field>
            </div>
            <Field label="권한">
              <select name="role" className={inputCls}>
                <option value="user">사용자</option>
                <option value="admin">관리자</option>
              </select>
            </Field>
            <Field label="유효 기간">
              <select name="ttl" className={inputCls} defaultValue="14">
                <option value="3">3일</option>
                <option value="14">14일</option>
                <option value="30">30일</option>
              </select>
            </Field>
            <Button type="submit" loading={busy} className="col-span-2">
              생성
            </Button>
          </SafeForm>
          {created && (
            <p className="mt-3 rounded-xl border border-ok/30 bg-ok/10 p-3 text-sm">
              초대 코드: <b className="font-mono text-base tracking-wider">{created.code}</b> (만료 {formatDate(created.expiresAt)})
            </p>
          )}
        </Card>

        <Card>
          <H2>초대 목록</H2>
          {invites.data && (
            <Paged items={invites.data.items} per={6} empty="초대가 없어요">
              {(slice) => (
                <ul className="divide-y divide-line text-sm">
                  {slice.map((i) => {
                    const state = i.state === "used" ? `사용됨(${i.used_by_name ?? "삭제된 계정"})` : i.state === "revoked" ? "취소됨" : i.state === "expired" ? "만료" : "대기 중";
                    return (
                      <li key={i.id} className="flex items-center gap-3 py-2">
                        <span className="min-w-0 flex-1">
                          {i.memo ?? "(메모 없음)"} <span className="text-xs text-ink-2">· {i.role} · {formatDate(i.created_at)}</span>
                        </span>
                        <span className="text-xs text-ink-2">{state}</span>
                        {state === "대기 중" && (
                          <button className="min-h-8 text-xs text-bad underline" onClick={() => act(() => api(`/api/admin/invitations/${i.id}`, { method: "DELETE" }))}>
                            취소
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Paged>
          )}
        </Card>

        <Card>
          <H2 sub="건수만 표시하며 기록 내용은 볼 수 없습니다.">사용자</H2>
          {users.data && (
            <Paged items={users.data.items} per={4}>
              {(slice) => (
                <ul className="divide-y divide-line text-sm">
                  {slice.map((u) => (
                    <li key={u.id} className="py-2">
                      <div className="flex items-baseline gap-2">
                        <b className="truncate">{u.display_name}</b>
                        <span className="text-xs text-ink-2">{u.role}</span>
                        <span className={`ml-auto text-xs ${u.status === "active" ? "text-ok" : "text-bad"}`}>{u.status === "active" ? "활성" : "비활성"}</span>
                      </div>
                      <p className="truncate text-xs text-ink-2">
                        {u.email} · 사주/해석 {u.calc_count}/{u.reading_count} · 최근 {u.last_login_at ? formatDate(u.last_login_at) : "—"}
                      </p>
                      {u.id !== adminId && (
                        <div className="mt-1 flex gap-3 text-xs">
                          <button
                            className="min-h-8 underline"
                            onClick={() => act(() => api(`/api/admin/users/${u.id}`, { method: "PATCH", body: { status: u.status === "active" ? "disabled" : "active" } }))}
                          >
                            {u.status === "active" ? "비활성화" : "활성화"}
                          </button>
                          <button
                            className="min-h-8 underline"
                            onClick={() => act(() => api(`/api/admin/users/${u.id}`, { method: "PATCH", body: { role: u.role === "admin" ? "user" : "admin" } }))}
                          >
                            {u.role === "admin" ? "관리자 해제" : "관리자 지정"}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Paged>
          )}
        </Card>
      </Pager>
    </div>
  );
}
