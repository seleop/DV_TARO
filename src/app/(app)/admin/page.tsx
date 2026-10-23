import { requirePageAdmin } from "@/lib/auth/session";
import { AdminClient } from "@/components/AdminClient";
import { TopBar } from "@/components/ui";

export default async function AdminPage() {
  const admin = await requirePageAdmin();
  return (
    <>
      <TopBar title="관리" back="/me" />
      <AdminClient adminId={admin.id} />
    </>
  );
}
