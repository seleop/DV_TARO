import { requirePageUser } from "@/lib/auth/session";
import { hasViewedDailyToday, homeDays } from "@/lib/home";
import { HomeView } from "@/components/home/HomeView";

export default async function Home() {
  const user = await requirePageUser();
  const calcId = user.primaryCalculationId;
  // 저장된 결과가 있는지만 본다 (AI 호출 없음). 조회가 실패해도 홈은 띄운다
  const [viewedToday, days] = await Promise.all([
    calcId ? hasViewedDailyToday(user.id, calcId).catch(() => false) : false,
    // 위쪽 오늘 줄(날짜·음력·일진): 계산이 실패해도 홈은 띄운다
    homeDays().catch(() => []),
  ]);
  // 위: 타로 점술사의 성소에서 인사하는 마스코트 (배경은 Screen 이 경로로 정함) / 아래: 좌우로 넘기는 메뉴 카드
  return <HomeView displayName={user.displayName} hasPrimary={!!calcId} viewedToday={viewedToday} days={days} />;
}
