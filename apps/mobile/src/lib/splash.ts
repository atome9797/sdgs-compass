// 시작 화면(스플래시): 저장된 설정을 AsyncStorage 에서 읽어 오는 동안 네이티브 스플래시를 그대로 보여 줘요.
// 읽기가 끝나면 hideSplash(), 무슨 일이 있어도 FAILSAFE_MS 뒤에는 내려가요(영영 안 내려가는 일이 없게).
import * as SplashScreen from "expo-splash-screen";

const FAILSAFE_MS = 4000;
let started = false;

/** 앱 모듈이 불러와질 때 한 번 (자동으로 내려가지 않게 붙잡아 둬요) */
export function keepSplashVisible(): void {
  if (started) return;
  started = true;
  SplashScreen.preventAutoHideAsync().catch(() => {});
  setTimeout(hideSplash, FAILSAFE_MS);
}

export function hideSplash(): void {
  SplashScreen.hideAsync().catch(() => {});
}
