import { requirePageUser } from "@/lib/auth/session";
import { getCalculation } from "@/lib/repo/records";
import { BIRTHPLACES } from "@/lib/saju/input";
import type { BirthInitial } from "@/components/BirthForm";
import { ProfileClient } from "@/components/ProfileClient";

const pad = (n: number) => String(n).padStart(2, "0");

export default async function ProfilePage({ searchParams }: PageProps<"/me/profile">) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const calc = user.primaryCalculationId ? await getCalculation(user.id, user.primaryCalculationId) : null;
  let initial: BirthInitial | null = null;
  if (calc) {
    const i = calc.input;
    const preset = i.longitude !== null ? BIRTHPLACES.find((b) => b.label === i.birthplaceLabel) : null;
    initial = {
      calendar: i.calendar,
      date: `${i.year}-${pad(i.month)}-${pad(i.day)}`,
      isLeapMonth: i.isLeapMonth,
      time: i.timeKnown ? `${pad(i.hour!)}:${pad(i.minute!)}` : null,
      gender: i.gender,
      birthplaceId: preset?.id ?? null,
      customLongitude: !preset && i.longitude !== null ? i.longitude : null,
      settings: i.settings,
    };
  }
  return <ProfileClient displayName={user.displayName} email={user.email} initial={initial} welcome={sp.welcome === "1"} />;
}
