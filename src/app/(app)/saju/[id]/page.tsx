import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/session";
import { getConfig } from "@/lib/config";
import { latestSajuReading } from "@/lib/ai/interpret";
import { getCalculation } from "@/lib/repo/records";
import { sajuView } from "@/lib/views";
import { SajuResult } from "@/components/SajuResult";

export default async function SajuPage({ params }: PageProps<"/saju/[id]">) {
  const user = await requirePageUser();
  const { id } = await params;
  const calc = await getCalculation(user.id, id);
  if (!calc) notFound();
  return (
    <SajuResult
      view={sajuView(calc)}
      initialReading={await latestSajuReading(user.id, calc)}
      aiProvider={getConfig().AI_PROVIDER}
      isPrimary={user.primaryCalculationId === id}
      displayName={user.displayName}
    />
  );
}
