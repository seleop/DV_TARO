import { requirePageUser } from "@/lib/auth/session";
import { listCalculations, listReadings } from "@/lib/repo/records";
import { MeClient } from "@/components/MeClient";

export default async function MePage() {
  const user = await requirePageUser();
  const [calcs, readings] = await Promise.all([listCalculations(user.id), listReadings(user.id, ["tarot", "horoscope"])]);
  const others = readings.map((r) => {
    const c = r.content as { question?: string; headline?: string; sign?: { nameKo: string }; date?: string; drawn?: Array<{ nameKo: string }> };
    return {
      id: r.id,
      kind: r.kind,
      createdAt: r.createdAt,
      title: r.kind === "tarot" ? (c.question ?? "타로") : `${c.sign?.nameKo ?? "별자리"} · ${c.date ?? ""}`,
      summary: r.kind === "tarot" ? (c.drawn ?? []).map((d) => d.nameKo).join(", ") : (c.headline ?? ""),
    };
  });
  return (
    <MeClient
      user={{ displayName: user.displayName, email: user.email, role: user.role, primaryCalculationId: user.primaryCalculationId }}
      calcs={calcs}
      others={others}
    />
  );
}
