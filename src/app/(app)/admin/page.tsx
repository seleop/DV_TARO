import Link from "next/link";
import { requirePageAdmin } from "@/lib/auth/session";
import { AdminClient } from "@/components/AdminClient";
import { TopBar } from "@/components/ui";

export default async function AdminPage() {
  const admin = await requirePageAdmin();
  return (
    <>
      <TopBar
        title="관리"
        back="/me"
        right={
          <Link href="/admin/character" className="text-sm text-ink-2">
            캐릭터
          </Link>
        }
      />
      <AdminClient adminId={admin.id} />
    </>
  );
}
