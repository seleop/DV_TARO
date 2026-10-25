import { requirePageUser } from "@/lib/auth/session";
import { hasViewedDailyToday } from "@/lib/home";
import { Screen } from "@/components/app/Screen";
import { HomeGreeting } from "@/components/home/HomeGreeting";
import { HomeMenu } from "@/components/home/HomeMenu";

export default async function Home() {
  const user = await requirePageUser();
  const calcId = user.primaryCalculationId;
  // 저장된 결과가 있는지만 본다 (AI 호출 없음). 조회가 실패해도 홈은 띄운다
  const viewedToday = calcId ? await hasViewedDailyToday(user.id, calcId).catch(() => false) : false;
  return (
    // 위: 타로 점술사의 성소에서 인사하는 별이 (배경은 Screen 이 경로로 정함) / 아래: 유리 시트에 오늘의 운세 큰 카드와 메뉴
    <Screen scene={<HomeGreeting name={user.displayName} />}>
      <HomeMenu hasPrimary={!!calcId} viewedToday={viewedToday} />
    </Screen>
  );
}
