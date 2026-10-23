import { handler, json } from "@/lib/api";
import { listUsersForAdmin } from "@/lib/repo/users";

export const GET = handler({ auth: "admin" }, async () => json({ items: await listUsersForAdmin() }));
