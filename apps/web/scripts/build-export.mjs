// 정적 내보내기 빌드: NEXT_OUTPUT=export 를 켜고 next build 를 실행해요 (결과는 apps/web/out).
// 운영체제와 상관없이 같은 명령으로 되도록 환경변수는 여기서 설정해요.
//   저장소 하위 주소에 올릴 때:  NEXT_PUBLIC_BASE_PATH=/sdgs-compass npm run build:export -w @sdgs-compass/web
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const result = spawnSync(process.execPath, [nextBin, "build", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NEXT_OUTPUT: "export" },
});
process.exit(result.status ?? 1);
