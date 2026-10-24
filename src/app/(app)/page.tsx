import { requirePageUser } from "@/lib/auth/session";
import { Screen } from "@/components/app/Screen";
import { HomeGreeting } from "@/components/home/HomeGreeting";
import { HomeMenu } from "@/components/home/HomeMenu";

export default async function Home() {
  const user = await requirePageUser();
  return (
    // 위: 해질녘 천막 입구 앞에서 인사하는 별이 / 아래: 크림색 시트에 오늘의 운세 큰 카드와 메뉴
    <Screen scene={<HomeGreeting name={user.displayName} />}>
      <HomeMenu hasPrimary={!!user.primaryCalculationId} />
    </Screen>
  );
}
