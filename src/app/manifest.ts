import type { MetadataRoute } from "next";
import { BRAND } from "@/config/brand";

/**
 * 홈 화면 설치용 웹 앱 매니페스트 (Android Chrome "앱 설치" / iOS Safari "홈 화면에 추가").
 * 오프라인 캐시(서비스워커)는 아직 없다 → docs/LIMITATIONS.md
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.appName,
    short_name: BRAND.appName,
    description: "사주·오늘의 운세·타로·별자리",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0820",
    theme_color: "#0a0820",
    lang: "ko",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
    ],
  };
}
