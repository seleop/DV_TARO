"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorText, formatDate } from "@/lib/client";
import { CharacterStage } from "./Character";
import { Button, Card, ErrorBox, Field, H2, inputCls, StatusBadge } from "./ui";

type Calc = { id: string; label: string | null; status: "MATCH" | "CONDITIONAL_MATCH" | "MISMATCH" | "UNVERIFIABLE"; createdAt: number; dayPillar: string | null; hasReading: boolean };
type Other = { id: string; kind: string; createdAt: number; title: string; summary: string };

export function MeClient({
  user,
  calcs,
  others,
}: {
  user: { displayName: string; email: string; role: string; primaryCalculationId: string | null };
  calcs: Calc[];
  others: Other[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    if (!confirm("로그아웃할까요?")) return;
    await api("/api/auth/logout", { method: "POST", body: {} }).catch(() => null);
    router.replace("/login");
    router.refresh();
  }

  const row = "flex items-center gap-3 px-4 py-3.5";
  return (
    <div className="flex flex-1 flex-col gap-4 pt-8">
      <div className="flex items-center gap-4 px-1">
        <CharacterStage size={76} orbs={false} />
        <div className="min-w-0 flex-1">
          <p className="text-[20px] font-bold">{user.displayName}님</p>
          <p className="truncate text-sm text-ink-2">{user.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          로그아웃
        </Button>
      </div>
      <Link href="/me/profile" className="glass flex items-center justify-between rounded-[22px] px-5 py-4 font-semibold">
        👤 프로필 설정 <span className="text-sm font-normal text-ink-2">닉네임 · 생년월일 ›</span>
      </Link>
      {user.role === "admin" && (
        <Link href="/admin" className="glass flex items-center justify-between rounded-[22px] px-5 py-4 font-semibold">
          🛠️ 관리자 화면 <span className="text-ink-2">›</span>
        </Link>
      )}
      <ErrorBox message={error} />

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-ink-2">사주 기록</h2>
        {calcs.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-2">
              아직 없어요.{" "}
              <Link href="/me/profile" className="text-accent underline">
                프로필에서 생년월일 입력하기
              </Link>
            </p>
          </Card>
        ) : (
          <ul className="glass divide-y divide-white/10 overflow-hidden rounded-[24px]">
            {calcs.map((c) => (
              <li key={c.id} className={row}>
                <Link href={`/saju/${c.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {c.label ?? (c.id === user.primaryCalculationId ? user.displayName : "이름 없음")}
                    {c.id === user.primaryCalculationId && <span className="ml-1.5 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent">내 사주</span>}
                  </span>
                  <span className="text-xs text-ink-2">
                    {c.dayPillar ? `${c.dayPillar} 일주` : "일주 미확정"} · {formatDate(c.createdAt)}
                  </span>
                </Link>
                <StatusBadge status={c.status} />
                <button
                  className="text-xs text-bad/80"
                  disabled={busy === c.id}
                  onClick={() => confirm("이 사주 기록을 삭제할까요?") && run(c.id, () => api(`/api/saju/${c.id}`, { method: "DELETE" }))}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-ink-2">타로 · 별자리 기록</h2>
        {others.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-2">아직 없어요.</p>
          </Card>
        ) : (
          <ul className="glass divide-y divide-white/10 overflow-hidden rounded-[24px]">
            {others.map((o) => (
              <li key={o.id} className={row}>
                <span className="text-xl" aria-hidden>
                  {o.kind === "tarot" ? "🃏" : "⭐"}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{o.title}</span>
                  <span className="block truncate text-xs text-ink-2">
                    {formatDate(o.createdAt)} · {o.summary}
                  </span>
                </div>
                <button
                  className="text-xs text-bad/80"
                  disabled={busy === o.id}
                  onClick={() => confirm("이 기록을 삭제할까요?") && run(o.id, () => api(`/api/readings/${o.id}`, { method: "DELETE" }))}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="glass rounded-[24px] px-5 py-4">
        <summary className="cursor-pointer font-semibold">개인정보 · 계정</summary>
        <div className="mt-4 space-y-5">
          <div>
            <H2 sub="계정은 남기고 출생 정보·사주·타로·별자리 기록을 모두 지워요. 되돌릴 수 없어요.">모든 기록 삭제</H2>
            <Button
              variant="danger"
              size="sm"
              loading={busy === "all"}
              onClick={() => confirm("정말 모든 기록을 삭제할까요?") && run("all", () => api("/api/me/records", { method: "DELETE" }))}
            >
              모든 기록 삭제
            </Button>
          </div>
          <DeleteAccount />
        </div>
      </details>
    </div>
  );
}

function DeleteAccount() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <H2 sub="계정과 모든 기록을 삭제해요. 다시 쓰려면 새 초대 코드가 필요해요.">계정 삭제</H2>
      <div className="space-y-3">
        <Field label="비밀번호 확인">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} autoComplete="current-password" />
        </Field>
        <Field label="‘계정 삭제’라고 입력">
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className={inputCls} />
        </Field>
        <ErrorBox message={error} />
        <Button
          variant="danger"
          size="sm"
          loading={busy}
          disabled={confirmText !== "계정 삭제" || !password}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await api("/api/me", { body: { password, confirm: confirmText } });
              router.replace("/login");
              router.refresh();
            } catch (e) {
              setError(errorText(e));
              setBusy(false);
            }
          }}
        >
          계정 삭제
        </Button>
      </div>
    </div>
  );
}
