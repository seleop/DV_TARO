import { requirePageUser } from "@/lib/auth/session";
import { SIGNS, signDateRange, signFor } from "@/lib/horoscope/zodiac";
import { getCalculation } from "@/lib/repo/records";
import { HoroscopeClient } from "@/components/HoroscopeClient";

export default async function HoroscopePage() {
  const user = await requirePageUser();
  const calc = user.primaryCalculationId ? await getCalculation(user.id, user.primaryCalculationId) : null;
  // 프로필에 생년월일이 있으면 양력 생일 기준 별자리를 미리 골라 둔다
  const profileSign = calc ? signFor(calc.result.solarDate.month, calc.result.solarDate.day).sign.id : null;
  const signs = SIGNS.map((s) => ({ id: s.id, nameKo: s.nameKo, symbol: s.symbol, element: s.element, range: signDateRange(s) }));
  // 달력 순서(양자리부터)로 보여 준다
  const ordered = [...signs.slice(3), ...signs.slice(0, 3)];
  return <HoroscopeClient signs={ordered} profileSignId={profileSign} />;
}
