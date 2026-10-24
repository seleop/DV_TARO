import { requirePageUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requirePageUser();
  return (
    // 화면 높이에 고정한다. 각 화면은 이 높이 안에 맞추고(Screen), 사주 설명처럼 긴 화면만 본문을 스크롤한다.
    // 하단 탭바는 없앴다(2026-10-24 사용자 결정). 홈은 메뉴 카드, 다른 화면은 HomeButton·TopBar 로 이동한다
    <div className="flex h-dvh flex-col">
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">{children}</main>
    </div>
  );
}
