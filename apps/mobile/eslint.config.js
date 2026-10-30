// ESLint 9 flat config (eslint-config-expo). android/, ios/ 는 prebuild 가 만드는 폴더라 검사하지 않아요.
const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  globalIgnores(["dist/*", "android/*", "ios/*", ".expo/*", "expo-env.d.ts", "coverage/*"]),
  expoConfig,
]);
