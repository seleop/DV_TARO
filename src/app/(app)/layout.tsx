import { requirePageUser } from "@/lib/auth/session";
import { BottomTabBar } from "@/components/app/BottomTabBar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requirePageUser();
  return (
    <>
      <main className="flex flex-1 flex-col px-5">{children}</main>
      <BottomTabBar />
    </>
  );
}
