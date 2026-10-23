import { BRAND } from "@/config/brand";
import { requirePageUser } from "@/lib/auth/session";
import { josa } from "@/lib/josa";
import { CharacterStage } from "@/components/Character";
import { BottomActions, LinkButton, Tile } from "@/components/ui";

export default async function Home() {
  const user = await requirePageUser();
  const hasPrimary = !!user.primaryCalculationId;
  return (
    <div className="flex flex-1 flex-col items-center pt-14 text-center">
      <p className="animate-rise text-[20px] font-semibold leading-snug">
        {josa(BRAND.characterName, "이/가")}
        <br />
        {user.displayName}님의 운세를 점쳐봤대요
      </p>
      <h1 className="text-gradient animate-rise mt-3 text-[40px] font-extrabold tracking-tight">오늘의 운세</h1>

      <CharacterStage size={280} className="my-6" />

      <div className="grid w-full grid-cols-4 gap-2.5">
        <Tile emoji="☀️" label="오늘 운세" href={hasPrimary ? "/today" : "/me/profile"} />
        <Tile emoji="🔮" label="사주 풀이" href="/saju" />
        <Tile emoji="🃏" label="타로" href="/tarot" />
        <Tile emoji="⭐" label="별자리" href="/horoscope" />
      </div>

      <BottomActions withTabBar>
        {hasPrimary ? (
          <LinkButton href="/today" variant="blue">
            시작하기
          </LinkButton>
        ) : (
          <LinkButton href="/me/profile" variant="blue">
            프로필에서 생년월일 입력하기
          </LinkButton>
        )}
      </BottomActions>
    </div>
  );
}
