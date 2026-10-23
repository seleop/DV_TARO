import type { Metadata, Viewport } from "next";
import { BRAND } from "@/config/brand";
import { AppFrame } from "@/components/app/AppFrame";
import "./globals.css";

export const metadata: Metadata = {
  title: BRAND.appName,
  description: "초대받은 사람만 쓰는 사주·운세·타로·별자리",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: BRAND.appName, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff7ec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="min-h-dvh bg-[#efe6dc]">
        {/* 화면별 장면(천막 입구·천막 안·별빛 정원)은 각 화면이 그린다. 틀은 위=하늘색, 아래=시트 크림색 */}
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
