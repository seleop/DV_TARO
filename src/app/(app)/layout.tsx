import { requirePageUser } from "@/lib/auth/session";
import { BottomTabBar } from "@/components/app/BottomTabBar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requirePageUser();
  return (
    // 화면 높이에 고정한다. 각 화면은 이 높이 안에 맞추고(Screen), 사주 설명처럼 긴 화면만 본문을 스크롤한다.
    <div className="flex h-dvh flex-col">
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pt-[env(safe-area-inset-top)]">{children}</main>
      <BottomTabBar />
    </div>
  );
}
