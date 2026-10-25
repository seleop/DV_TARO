import { requirePageUser } from "@/lib/auth/session";
import { MascotNameProvider } from "@/components/MascotName";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requirePageUser();
  return (
    // 화면 높이에 고정한다. 각 화면은 이 높이 안에 맞추고(Screen), 사주 설명처럼 긴 화면만 본문을 스크롤한다.
    // 하단 탭바는 없앴다(2026-10-24 사용자 결정). 홈은 메뉴 카드, 다른 화면은 HomeButton·TopBar 로 이동한다
    // 사용자가 지어 준 마스코트 이름을 모든 화면이 쓰게 한다 (이름을 바꾸면 router.refresh 로 다시 받는다)
    <MascotNameProvider name={user.mascotName}>
      <div className="flex h-dvh flex-col">
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">{children}</main>
      </div>
    </MascotNameProvider>
  );
}
