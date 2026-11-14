import type { MetadataRoute } from "next";
import { COLORS } from "@sdgs-compass/core/theme";
import { withBase } from "@/lib/routes";

// 정적 내보내기에서도 만들어지도록 고정해요. manifest 안의 주소는 Next 가 손대지 않아서 basePath 를 직접 붙여요.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: withBase("/"),
    name: "勇者さま、助けてください！｜SDGsコンパス（デモ版）",
    short_name: "勇者さま、助けて",
    description: "企業（依頼主）のSDGsの課題を、学生（勇者）がアイデアで解決するクエスト型マッチング（サンプルデータのデモ）",
    lang: "ja",
    start_url: withBase("/"),
    scope: withBase("/"),
    display: "standalone",
    orientation: "portrait",
    background_color: COLORS.bg,
    theme_color: COLORS.bg,
    icons: [
      { src: withBase("/icons/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: withBase("/icons/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: withBase("/icons/maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
