// 바깥 주소 열기 도우미 (순수 함수). 앱 안에서 열 주소는 http(s) 만 허용해서, 이상한 방식(tel:, intent: 등)의 주소가 열리지 않게 해요.

/** http:// 또는 https:// 로 시작하는 주소인지 */
export function isHttpUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim());
}
