import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/auth/session";
import { getConfig } from "@/lib/config";
import { TodayClient } from "@/components/TodayClient";

export default async function TodayPage() {
  const user = await requirePageUser();
  if (!user.primaryCalculationId) redirect("/me/profile");
  return <TodayClient calculationId={user.primaryCalculationId} displayName={user.displayName} aiProvider={getConfig().AI_PROVIDER} />;
}
