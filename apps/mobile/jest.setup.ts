import AsyncStorage from "@react-native-async-storage/async-storage";

// 모든 테스트 전에: 네이티브 저장소(AsyncStorage)를 메모리 목으로 바꿉니다. (jest.mock 은 import 보다 먼저 실행돼요)
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// 안전 영역(노치·홈 표시줄) 값을 고정된 가짜 값으로
jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

// 메모리 목은 한 테스트 파일 안에서 계속 남아요. 앞 테스트가 저장한 설정·데모 상태가 다음 테스트에 남지 않게 매번 비웁니다.
beforeEach(async () => {
  await AsyncStorage.clear();
});
