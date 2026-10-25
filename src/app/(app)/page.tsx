import { requirePageUser } from "@/lib/auth/session";
import { hasViewedDailyToday } from "@/lib/home";
import { Screen } from "@/components/app/Screen";
import { HOME_BACKDROPS, isHomeBackdropId } from "@/components/home/HomeBackdrops";
import { HomeGreeting } from "@/components/home/HomeGreeting";
import { HomeMenu } from "@/components/home/HomeMenu";

export default async function Home({ searchParams }: PageProps<"/">) {
  const user = await requirePageUser();
  const calcId = user.primaryCalculationId;
  // 저장된 결과가 있는지만 본다 (AI 호출 없음). 조회가 실패해도 홈은 띄운다
  const viewedToday = calcId ? await hasViewedDailyToday(user.id, calcId).catch(() => false) : false;
  // 배경 시안 비교용 (?bg=1~6). 사용자가 하나를 고르면 그것으로 고정하고 이 분기는 지운다
  const bg = (await searchParams).bg;
  const backdrop = isHomeBackdropId(bg) ? HOME_BACKDROPS[bg] : null;
  return (
    // 위: 장면 앞에서 인사하는 별이 / 아래: 시트에 오늘의 운세 큰 카드와 메뉴
    <Screen scene={<HomeGreeting name={user.displayName} />} backdrop={backdrop?.render()} night={!!backdrop}>
      <HomeMenu hasPrimary={!!calcId} viewedToday={viewedToday} />
    </Screen>
  );
}
