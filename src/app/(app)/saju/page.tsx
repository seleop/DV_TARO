import Link from "next/link";
import { requirePageUser } from "@/lib/auth/session";
import { listCalculations } from "@/lib/repo/records";
import { CharacterStage } from "@/components/Character";
import { FitCharacter, Pager, Screen } from "@/components/app/Screen";
import { LinkButton, StatusBadge } from "@/components/ui";

/** 가족·친구 목록은 한 장에 이만큼씩 보여 주고 좌우로 넘긴다 (스크롤 없는 화면) */
const PER_PAGE = 4;

export default async function SajuHub() {
  const user = await requirePageUser();
  const items = await listCalculations(user.id);
  const primary = items.find((i) => i.id === user.primaryCalculationId) ?? null;
  const others = items.filter((i) => i.id !== primary?.id);
  const pages = Array.from({ length: Math.ceil(others.length / PER_PAGE) }, (_, i) => others.slice(i * PER_PAGE, (i + 1) * PER_PAGE));
  return (
    <Screen
      footer={
        <LinkButton href="/saju/new" variant="primary">
          다른 사람 사주 보기
        </LinkButton>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col pt-[clamp(0.75rem,4dvh,2.5rem)]">
      <h1 className="shrink-0 text-center text-[26px] font-bold">사주 풀이</h1>
      <p className="mt-1 shrink-0 text-center text-sm text-ink-2">여러 계산 엔진으로 교차검증한 원국을 AI가 풀어 드려요</p>

      {primary ? (
        <Link href={`/saju/${primary.id}`} className="glass mt-4 flex shrink-0 items-center gap-4 rounded-[28px] p-4 active:scale-[0.99]">
          <CharacterStage size={84} orbs={false} />
          <span className="min-w-0 flex-1">
            <span className="text-xs text-accent">내 사주 · 프로필 설정에서 변경</span>
            <span className="mt-0.5 block truncate text-[17px] font-semibold">{primary.label ?? user.displayName}</span>
            <span className="text-sm text-ink-2">{primary.dayPillar ? `${primary.dayPillar} 일주` : "일주 미확정"}</span>
          </span>
          <StatusBadge status={primary.status} />
        </Link>
      ) : (
        <div className="glass mt-4 flex shrink-0 flex-col items-center rounded-[28px] p-5 text-center">
          <CharacterStage pose="saju" size={110} orbs={false} />
          <p className="mt-2 font-semibold">아직 내 사주가 없어요</p>
          <p className="mt-1 text-sm text-ink-2">프로필 설정에서 생년월일을 입력하면 오늘의 운세도 볼 수 있어요</p>
          <Link href="/me/profile" className="mt-3 rounded-full bg-accent/20 px-4 py-2 text-sm font-semibold text-accent">
            프로필 설정으로
          </Link>
        </div>
      )}

      {others.length > 0 ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <h2 className="mb-2 shrink-0 px-1 text-sm font-semibold text-ink-2">가족·친구의 사주 {others.length}</h2>
          <Pager labels={pages.map((_, i) => `${i + 1}쪽`)}>
            {pages.map((page, pi) => (
          <ul key={pi} className="glass divide-y divide-white/10 overflow-hidden rounded-[24px]">
            {page.map((r) => (
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
            ))}
          </Pager>
        </div>
      ) : (
        <FitCharacter pose="saju" orbs={false} min={80} max={200} className="w-full" />
      )}
      </div>
    </Screen>
  );
}
