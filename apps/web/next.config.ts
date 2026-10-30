import type { NextConfig } from "next";

// 같은 코드로 두 가지 배포를 해요.
//  - 평소(npm run build): 서버가 있는 일반 빌드. 보안 헤더를 붙여요.
//  - 정적 내보내기(npm run build:export, NEXT_OUTPUT=export): GitHub Pages 같은 정적 호스팅용 out/ 폴더.
//    정적 내보내기에서는 headers() 를 쓸 수 없어서 건너뛰어요. 저장소 하위 주소(예: /sdgs-compass)는 NEXT_PUBLIC_BASE_PATH 로 알려 줘요.
const isExport = process.env.NEXT_OUTPUT === "export";

/** "" 또는 "/sdgs-compass" 모양으로 맞춰요 (앞 슬래시 하나, 뒤 슬래시 없음) */
function normalizeBase(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? "" : `/${trimmed}`;
}
const basePath = normalizeBase(process.env.NEXT_PUBLIC_BASE_PATH);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // 모노레포의 공용 패키지(TypeScript 소스 그대로)
  transpilePackages: ["@sdgs-compass/core", "@sdgs-compass/data"],
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  ...(isExport
    ? { output: "export" as const, trailingSlash: true, images: { unoptimized: true } }
    : {
        async headers() {
          return [{ source: "/:path*", headers: securityHeaders }];
        },
      }),
};

export default nextConfig;
