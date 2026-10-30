// 앱 정보 (설정 화면 '이 앱에 대해'에 보여 줘요). 버전은 app.config.ts 의 version 을 읽고, 못 읽으면 같은 값을 써요.
import Constants from "expo-constants";

export const FALLBACK_VERSION = "0.1.0";

export const APP_VERSION: string = Constants.expoConfig?.version ?? FALLBACK_VERSION;

/** 소스 코드 저장소 (공개 저장소) */
export const REPO_URL = "https://github.com/atome9797/sdgs-compass";
