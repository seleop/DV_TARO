import { z } from "zod";
import { handler, json } from "@/lib/api";
import { createInvitation, listInvitations } from "@/lib/repo/users";

const Body = z
  .object({
    role: z.enum(["user", "admin"]).default("user"),
    memo: z.string().trim().max(40).nullable().default(null),
    ttlDays: z.number().int().min(1).max(60).default(14),
  })
  .strict();

export const GET = handler({ auth: "admin" }, async () => json({ items: await listInvitations() }));

export const POST = handler({ auth: "admin" }, async ({ user, body }) => {
  const b = Body.parse(body);
  return json({ invitation: await createInvitation(user.id, b.role, b.memo, b.ttlDays) }, 201);
});
