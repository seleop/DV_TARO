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
    // 위: 해질녘 천막 입구 앞에서 인사하는 별이 / 아래: 크림색 시트에 오늘의 운세 큰 카드와 메뉴
    <Screen scene={<HomeGreeting name={user.displayName} />}>
      <HomeMenu hasPrimary={!!calcId} viewedToday={viewedToday} />
    </Screen>
  );
}
