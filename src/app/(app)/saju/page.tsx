import Link from "next/link";
import { requirePageUser } from "@/lib/auth/session";
import { listCalculations } from "@/lib/repo/records";
import { CharacterStage } from "@/components/Character";
import { BottomActions, LinkButton, StatusBadge } from "@/components/ui";

export default async function SajuHub() {
  const user = await requirePageUser();
  const items = await listCalculations(user.id);
  const primary = items.find((i) => i.id === user.primaryCalculationId) ?? null;
  const others = items.filter((i) => i.id !== primary?.id);
  return (
    <div className="flex flex-1 flex-col pt-10">
      <h1 className="text-center text-[26px] font-bold">사주 풀이</h1>
      <p className="mt-1 text-center text-sm text-ink-2">여러 계산 엔진으로 교차검증한 원국을 AI가 풀어 드려요</p>

      {primary ? (
        <Link href={`/saju/${primary.id}`} className="glass mt-6 flex items-center gap-4 rounded-[28px] p-4 active:scale-[0.99]">
          <CharacterStage size={84} orbs={false} />
          <span className="min-w-0 flex-1">
            <span className="text-xs text-accent">내 사주 · 프로필 설정에서 변경</span>
            <span className="mt-0.5 block truncate text-[17px] font-semibold">{primary.label ?? user.displayName}</span>
            <span className="text-sm text-ink-2">{primary.dayPillar ? `${primary.dayPillar} 일주` : "일주 미확정"}</span>
          </span>
          <StatusBadge status={primary.status} />
        </Link>
      ) : (
        <div className="glass mt-6 flex flex-col items-center rounded-[28px] p-6 text-center">
          <CharacterStage pose="saju" size={150} orbs={false} />
          <p className="mt-2 font-semibold">아직 내 사주가 없어요</p>
          <p className="mt-1 text-sm text-ink-2">프로필 설정에서 생년월일을 입력하면 오늘의 운세도 볼 수 있어요</p>
          <Link href="/me/profile" className="mt-3 rounded-full bg-accent/20 px-4 py-2 text-sm font-semibold text-accent">
            프로필 설정으로
          </Link>
        </div>
      )}

      {others.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 px-1 text-sm font-semibold text-ink-2">가족·친구의 사주</h2>
          <ul className="glass divide-y divide-white/10 overflow-hidden rounded-[24px]">
            {others.map((r) => (
              <li key={r.id}>
                <Link href={`/saju/${r.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-white/5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.label ?? "이름 없음"}</span>
                    <span className="text-xs text-ink-2">{r.dayPillar ? `${r.dayPillar} 일주` : "일주 미확정"}{r.hasReading ? " · AI 해석 있음" : ""}</span>
                  </span>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BottomActions withTabBar>
        <LinkButton href="/saju/new" variant="primary">
          다른 사람 사주 보기
        </LinkButton>
      </BottomActions>
    </div>
  );
}
