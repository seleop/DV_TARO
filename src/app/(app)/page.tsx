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
      // 위: 해질녘 천막 입구 앞에 선 별이 / 아래: 크림색 시트에 메뉴와 시작 버튼
      scene={
        <div className="flex min-h-0 flex-1 flex-col items-center pt-[clamp(0.5rem,3dvh,2rem)] text-center">
          <p className="animate-rise text-[clamp(15px,2.4dvh,18px)] font-semibold leading-snug text-ink">
            {josa(BRAND.characterName, "이/가")} {user.displayName}님의 운세를 점쳐봤대요
          </p>
          <h1 className="text-gradient animate-rise mt-1 text-[clamp(28px,4.6dvh,38px)] font-extrabold tracking-tight">오늘의 운세</h1>
          {/* 남는 높이에 맞춰 별이 크기를 정하고, 천막 앞 마당에 서도록 아래에 붙인다 */}
          <FitCharacter min={90} max={300} className="w-full items-end" />
        </div>
      }
      footer={
        hasPrimary ? (
          <LinkButton href="/today" variant="primary">
            오늘 운세 보기
          </LinkButton>
        ) : (
          <LinkButton href="/me/profile" variant="primary">
            프로필에서 생년월일 입력하기
          </LinkButton>
        )
      }
    >
      <div className="grid w-full shrink-0 grid-cols-4 gap-2.5">
        <Tile emoji="☀️" label="오늘 운세" href={hasPrimary ? "/today" : "/me/profile"} />
        <Tile emoji="📜" label="사주 풀이" href="/saju" />
        <Tile emoji="🃏" label="타로" href="/tarot" />
        <Tile emoji="✨" label="별자리" href="/horoscope" />
      </div>
    </Screen>
  );
}
