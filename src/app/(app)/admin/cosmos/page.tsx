import type { Metadata } from "next";
import { requirePageAdmin } from "@/lib/auth/session";
import { CosmosPreview } from "./CosmosPreview";

export const metadata: Metadata = { title: "우주 배경 미리보기" };

/** 관리자 전용: 3D 우주 배경(은하수·별똥별 유람)을 다른 화면과 분리해 확인하는 곳 */
export default async function CosmosPreviewPage() {
  await requirePageAdmin();
  return <CosmosPreview />;
}
