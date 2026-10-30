// Jest (jest-expo 프리셋). 네이티브 모듈은 프리셋과 jest.setup.ts 가 흉내 냅니다.
/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/android/", "<rootDir>/ios/", "<rootDir>/dist/"],
  // 캐시가 빈 첫 실행(새 실행기)에서는 기본 5초를 넘길 수 있어요
  testTimeout: 30_000,
  // CI 에서는 코어의 절반만 써요 (실행기에서 한꺼번에 돌다가 서로 느려지지 않게)
  ...(process.env.CI ? { maxWorkers: "50%" } : {}),
};
