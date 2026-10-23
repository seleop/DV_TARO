import { appIconResponse } from "@/lib/app-icon";

// 안드로이드 설치용 매니페스트 아이콘 (192, 512만 허용)
export async function GET(_req: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const { size } = await ctx.params;
  if (size !== "192" && size !== "512") return new Response("Not found", { status: 404 });
  const res = appIconResponse(Number(size));
  res.headers.set("cache-control", "public, max-age=86400");
  return res;
}
