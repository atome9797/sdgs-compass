// core 에 적힌 협력 단체 로고가 앱에 모두 묶여 있는지 (빠지면 배너에 로고 대신 이모지가 나와요)
import { PARTNER_BANNERS } from "@sdgs-compass/core/partners";
import { PARTNER_LOGOS } from "../partnerLogos";

test("core 의 로고 파일 이름마다 앱에 묶은 그림이 있어요", () => {
  const files = PARTNER_BANNERS.flatMap((p) => (p.logo ? [p.logo] : []));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) expect(PARTNER_LOGOS[file]).toBeDefined();
  expect(Object.keys(PARTNER_LOGOS).sort()).toEqual([...files].sort());
});
