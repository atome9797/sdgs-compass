// 협력 단체 배너의 로고 주소. 파일은 public/partners/ 에 두고(core 의 PARTNER_BANNERS[].logo 와 같은 이름),
// GitHub Pages 의 하위 주소(basePath) 앞에 붙여요 — 그냥 <img> 는 basePath 를 붙여 주지 않아요.
import { currentBasePath } from "@/lib/routes";

export function partnerLogoSrc(file: string, basePath: string = currentBasePath()): string {
  return `${basePath}/partners/${encodeURIComponent(file)}`;
}
