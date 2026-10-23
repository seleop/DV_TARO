import type { Metadata, Viewport } from "next";
import { BRAND } from "@/config/brand";
import { CosmicBackdrop } from "@/components/app/CosmicBackdrop";
import "./globals.css";

export const metadata: Metadata = {
  title: BRAND.appName,
  description: "초대받은 사람만 쓰는 사주·운세·타로·별자리",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: BRAND.appName, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0820",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="min-h-dvh bg-[#06051a]">
        {/* PC에서는 가운데에 폰 폭(440px) 화면으로, 모바일에서는 전체 화면으로 보인다 */}
        <div className="cosmic-bg relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col overflow-hidden supports-[overflow:clip]:overflow-clip shadow-[0_0_80px_rgba(0,0,0,0.6)]">
          {/* 은하수·성운·별똥별 우주 배경 */}
          <CosmicBackdrop />
          <div className="relative flex flex-1 flex-col">{children}</div>
        </div>
      </body>
    </html>
  );
}
