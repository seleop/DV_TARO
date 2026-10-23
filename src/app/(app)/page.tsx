import { BRAND } from "@/config/brand";
import { requirePageUser } from "@/lib/auth/session";
import { josa } from "@/lib/josa";
import { FitCharacter, Screen } from "@/components/app/Screen";
import { LinkButton, Tile } from "@/components/ui";

export default async function Home() {
  const user = await requirePageUser();
  const hasPrimary = !!user.primaryCalculationId;
  return (
    <Screen
      footer={
        hasPrimary ? (
          <LinkButton href="/today" variant="blue">
            시작하기
          </LinkButton>
        ) : (
          <LinkButton href="/me/profile" variant="blue">
            프로필에서 생년월일 입력하기
          </LinkButton>
        )
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center pt-[clamp(1rem,5dvh,3.5rem)] text-center">
        <p className="animate-rise text-[clamp(16px,2.6dvh,20px)] font-semibold leading-snug">
          {josa(BRAND.characterName, "이/가")}
          <br />
          {user.displayName}님의 운세를 점쳐봤대요
        </p>
        <h1 className="text-gradient animate-rise mt-2 text-[clamp(30px,5dvh,40px)] font-extrabold tracking-tight">오늘의 운세</h1>

        {/* 남는 높이에 맞춰 복이 크기를 정한다 */}
        <FitCharacter min={90} max={280} className="w-full py-2" />

        <div className="grid w-full shrink-0 grid-cols-4 gap-2.5 pb-1">
          <Tile emoji="☀️" label="오늘 운세" href={hasPrimary ? "/today" : "/me/profile"} />
          <Tile emoji="🔮" label="사주 풀이" href="/saju" />
          <Tile emoji="🃏" label="타로" href="/tarot" />
          <Tile emoji="⭐" label="별자리" href="/horoscope" />
        </div>
      </div>
    </Screen>
  );
}
