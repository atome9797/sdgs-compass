// 루트: 시작 화면 붙잡기 → 테마 → 저장된 설정 읽기(AppProvider) → 지금 열 화면 묶음.
// 맨 처음 언어를 고르고(language) → 이용 유형을 고르면(role) → 학생·개인 화면((tabs) 등) 또는 기업·단체 화면(b2b)이 열려요.
// Stack.Protected 가 지금 열 수 있는 묶음만 열어 줘서, 설정에서 언어·유형을 바꾸거나 데모를 초기화하면 알맞은 곳으로 자동으로 가요.
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SplashView } from "@/components/SplashView";
import { AppProvider, useApp } from "@/lib/AppProvider";
import { hideSplash, keepSplashVisible } from "@/lib/splash";
import { NavigationTheme } from "@/theme/NavigationTheme";

// 앱 모듈이 불러와지는 순간 (저장된 값을 읽기 전에) 네이티브 스플래시가 자동으로 내려가지 않게 붙잡아요
keepSplashVisible();

function Routes() {
  const { gate } = useApp();
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={gate === "language"}>
          <Stack.Screen name="language" />
        </Stack.Protected>
        <Stack.Protected guard={gate === "role"}>
          <Stack.Screen name="role" />
        </Stack.Protected>
        <Stack.Protected guard={gate === "b2c"}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="challenge/[id]" />
          <Stack.Screen name="challenge/submit/[id]" />
          <Stack.Screen name="certificate/[id]" />
          <Stack.Screen name="share" />
          <Stack.Screen name="impact-summary" />
          <Stack.Screen name="wallet" />
          <Stack.Screen name="feed/new" />
        </Stack.Protected>
        <Stack.Protected guard={gate === "b2b"}>
          <Stack.Screen name="b2b" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <NavigationTheme>
      <AppProvider fallback={<SplashView />} onReady={hideSplash}>
        <Routes />
      </AppProvider>
    </NavigationTheme>
  );
}
