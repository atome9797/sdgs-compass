import type { ExpoConfig } from "expo/config";

// SDGsコンパス (공모전 시연용 데모 앱). 서버·로그인·푸시가 없어서 비밀 값도 필요 없어요 — 환경 변수 없이 그대로 빌드됩니다.
// 앱 이름은 일본어로 두고, 앱 안에서 일본어/한국어를 고를 수 있어요(첫 실행 때 언어 선택, 설정에서 변경).
// ios/·android/ 폴더는 `expo prebuild` 가 이 파일로 만드는 것이라 저장소에 넣지 않아요.

const BUNDLE_ID = "com.sdgscompass.app";
/** 디자인 토큰 COLORS.primary / COLORS.bg 와 같은 값 (설정 파일은 앱 코드를 불러오지 않아서 글자로 적어요) */
const PRIMARY = "#1D6FB8";
const BACKGROUND = "#F3F6FA";

const config: ExpoConfig = {
  name: "SDGsコンパス",
  slug: "sdgs-compass",
  scheme: "sdgscompass",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "light",
  backgroundColor: BACKGROUND,
  platforms: ["ios", "android"],
  ios: {
    bundleIdentifier: BUNDLE_ID,
    // 화면 폭이 휴대폰(430pt)에 맞춰져 있어서 태블릿 전용 레이아웃은 두지 않아요
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: PRIMARY,
    },
  },
  plugins: [
    "expo-router",
    // expo-status-bar 58.0.4 부터 설정 플러그인이 있어요 (expo install 이 더하라고 안내)
    "expo-status-bar",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 120,
        backgroundColor: PRIMARY,
      },
    ],
  ],
};

export default config;
