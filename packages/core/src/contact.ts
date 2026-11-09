// 연락처 검출: 메일 주소 · 전화번호는 앱의 글(SNS 글 · 연구 의뢰 · 기업 간 의뢰 · 평가 · 기획서의 세미나 이름)에 쓰지 않아요 — 연락은 앱 안에서 해요.
// db/schema.sql 의 mask_contacts() 와 같은 규칙이에요 (메시지의 연락처 가리기, F-603). 둘이 어긋나면 db/tests/04_parity.sql 이 잡아내요.
// 데모용 규칙이라 전각 숫자 같은 변형은 못 잡아요. 실서비스는 전용 검출기를 붙여요.
// (post.ts 가 같은 함수를 다시 내보내요 — 예전처럼 "@sdgs-compass/core/post" 에서 가져와도 돼요)

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_PATTERN = /\+[0-9]{1,3}[ -]?[0-9]{1,4}[ -]?[0-9]{3,4}[ -]?[0-9]{3,4}|[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{3,4}/;

/** 이메일 주소나 전화번호처럼 보이는 글자가 들어 있는지 (8자리 이상 이어진 숫자도 전화번호로 봐요) */
export function containsContact(text: string): boolean {
  return EMAIL_PATTERN.test(text) || PHONE_PATTERN.test(text);
}
