// 모노레포 전체에 React가 한 벌만 있는지 확인합니다.
// apps/web 과 apps/mobile 이 서로 다른 react / react-dom / @types/react 를 쓰면 실패해요.
// (Metro는 react 를 한 벌로 맞춰 주지만 Jest·tsc·ESLint는 그렇지 않아서 "Invalid hook call" 같은 문제가 생겨요.)
// 원인 찾기: npm ls react --all  /  npm why react
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const workspaces = ["apps/web", "apps/mobile"];
const packages = ["react", "react-dom", "@types/react"];

let failed = false;
for (const pkg of packages) {
  const hits = workspaces.map((ws) => {
    const req = createRequire(path.join(root, ws, "package.json"));
    try {
      const file = req.resolve(`${pkg}/package.json`);
      const { version } = JSON.parse(readFileSync(file, "utf8"));
      return { ws, file, version };
    } catch {
      return { ws, file: null, version: null };
    }
  });
  const found = hits.filter((hit) => hit.file);
  const files = new Set(found.map((hit) => hit.file));
  const summary = hits.map((hit) => `  ${hit.ws}: ${hit.file ? `${hit.version} (${path.relative(root, hit.file)})` : "없음"}`).join("\n");
  if (found.length === 0 || files.size > 1) {
    console.error(`✗ ${pkg} 가 한 벌이 아니에요:\n${summary}`);
    failed = true;
  } else {
    console.log(`✓ ${pkg} ${found[0].version} 한 벌\n${summary}`);
  }
}
process.exit(failed ? 1 : 0);
