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
    // Expo 템플릿이 기본으로 넣는 권한 중 이 앱에 필요 없는 것을 빼요. 파일·진동·다른 앱 위에 그리기를 쓰지 않고(저장은 앱 안 AsyncStorage 만),
    // "서버·로그인 없음"이라는 설명과 설치 화면의 권한 목록이 어긋나지 않게 하려는 거예요. 남는 것은 INTERNET(React Native 기본) 하나예요.
    // android-apk.yml 이 빌드한 APK 에서 이 권한들이 정말 빠졌는지 확인해요.
    blockedPermissions: [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.VIBRATE",
    ],
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
