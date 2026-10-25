import Link from "next/link";
import { requirePageUser } from "@/lib/auth/session";
import { listCalculations } from "@/lib/repo/records";
import { HomeButton } from "@/components/app/HomeButton";
import { FitCharacter, Pager, Screen } from "@/components/app/Screen";
import { LinkButton } from "@/components/ui";

/** 가족·친구 목록은 한 장에 이만큼씩 보여 주고 좌우로 넘긴다 (스크롤 없는 화면) */
const PER_PAGE = 3;

export default async function SajuHub() {
  const user = await requirePageUser();
  const items = await listCalculations(user.id);
  const primary = items.find((i) => i.id === user.primaryCalculationId) ?? null;
  const others = items.filter((i) => i.id !== primary?.id);
  const pages = Array.from({ length: Math.ceil(others.length / PER_PAGE) }, (_, i) => others.slice(i * PER_PAGE, (i + 1) * PER_PAGE));
  return (
    <Screen
      // 위: 천막 안에서 사주책을 읽는 별이 / 아래: 내 사주·가족 사주 목록
      scene={
        <div className="flex min-h-0 flex-1 flex-col items-center pt-[clamp(3.25rem,8dvh,4.75rem)] text-center">
          <HomeButton />
          <h1 className="shrink-0 text-[26px] font-extrabold text-ink">사주 풀이</h1>
          <p className="mt-0.5 shrink-0 text-sm text-ink-2">사주책을 펼쳐 한 장씩 풀어 드려요</p>
          <FitCharacter pose="saju" min={90} max={280} className="w-full items-end" />
        </div>
      }
      footer={
        <LinkButton href="/saju/new" variant="primary">
          다른 사람 사주 보기
        </LinkButton>
      }
    >
      {primary ? (
        <Link href={`/saju/${primary.id}`} className="glass flex shrink-0 items-center gap-4 rounded-[24px] p-4 active:scale-[0.99]">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tile text-2xl" aria-hidden>
            📜
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-xs text-accent">내 사주 · 프로필 설정에서 변경</span>
            <span className="mt-0.5 block truncate text-[17px] font-semibold">{primary.label ?? user.displayName}</span>
            <span className="text-sm text-ink-2">{primary.dayPillar ? `${primary.dayPillar} 일주` : "일주 미정"}</span>
          </span>
        </Link>
      ) : (
        <div className="glass flex shrink-0 flex-col items-center rounded-[24px] p-4 text-center">
          <p className="font-semibold">아직 내 사주가 없어요</p>
          <p className="mt-1 text-sm text-ink-2">프로필 설정에서 생년월일을 입력하면 오늘의 운세도 볼 수 있어요</p>
          <Link href="/me/profile" className="mt-3 rounded-full bg-accent/15 px-4 py-2 text-sm font-semibold text-accent">
            프로필 설정으로
          </Link>
        </div>
      )}

      {others.length > 0 && (
        <div className="mt-3 flex h-[min(30dvh,220px)] flex-col">
          <h2 className="mb-2 shrink-0 px-1 text-sm font-semibold text-ink-2">가족·친구의 사주 {others.length}</h2>
          <Pager labels={pages.map((_, i) => `${i + 1}쪽`)}>
            {pages.map((page, pi) => (
              <ul key={pi} className="glass divide-y divide-line overflow-hidden rounded-[24px]">
                {page.map((r) => (
                  <li key={r.id}>
                    <Link href={`/saju/${r.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-black/5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.label ?? "이름 없음"}</span>
                        <span className="text-xs text-ink-2">
                          {r.dayPillar ? `${r.dayPillar} 일주` : "일주 미정"}
                          {r.hasReading ? " · AI 해석 있음" : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </Pager>
        </div>
      )}
    </Screen>
  );
}
