import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PARTNER_BANNERS } from "@sdgs-compass/core/partners";
import { partnerLogoSrc } from "./partnerLogos";

function publicDir(): string {
  for (const candidate of [path.join(process.cwd(), "public"), path.join(process.cwd(), "apps/web/public")]) {
    if (existsSync(path.join(candidate, "icons"))) return candidate;
  }
  throw new Error("public 폴더를 찾을 수 없어요");
}

describe("협력 단체 배너의 로고", () => {
  it("주소: basePath 가 있으면 앞에 붙여요", () => {
    expect(partnerLogoSrc("marine-sweeper.png", "")).toBe("/partners/marine-sweeper.png");
    expect(partnerLogoSrc("marine-sweeper.png", "/sdgs-compass")).toBe("/sdgs-compass/partners/marine-sweeper.png");
  });

  it("core 에 적힌 로고 파일이 모두 public/partners/ 에 있어요", () => {
    const files = PARTNER_BANNERS.flatMap((p) => (p.logo ? [p.logo] : []));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) expect(existsSync(path.join(publicDir(), "partners", file)), file).toBe(true);
  });
});
