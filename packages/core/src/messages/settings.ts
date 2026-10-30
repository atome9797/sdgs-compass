// 설정·안내 문구
import type { LocalizedText } from "../i18n";

export const settings = {
  "settings.title": { ja: "設定", ko: "설정" },
  "settings.language": { ja: "言語", ko: "언어" },
  "settings.languageNote": { ja: "アプリ全体の表示言語を切り替えます", ko: "앱 전체의 표시 언어를 바꿔요" },
  "settings.role": { ja: "利用タイプ（デモ）", ko: "이용 유형(데모)" },
  "settings.roleNote": { ja: "学生と企業の画面を切り替えて、一連の流れを確認できます。", ko: "학생 화면과 기업 화면을 바꿔 가며 전체 흐름을 확인할 수 있어요." },
  "settings.switchToB2c": { ja: "学生として見る", ko: "학생으로 보기" },
  "settings.switchToB2b": { ja: "企業として見る", ko: "기업으로 보기" },
  "settings.resetTitle": { ja: "デモデータをリセット", ko: "데모 데이터 초기화" },
  "settings.resetDesc": { ja: "入力した内容を消して、最初のサンプル状態に戻します。", ko: "입력한 내용을 지우고 처음 샘플 상태로 되돌려요." },
  "settings.resetDone": { ja: "リセットしました", ko: "초기화했어요" },
  "settings.about": { ja: "このアプリについて", ko: "이 앱에 대해" },
  "settings.version": { ja: "バージョン", ko: "버전" },
  "settings.demoNotice": { ja: "試作版です。サンプルデータで動作し、サーバー連携・決済・実際のOAuthログイン・ブロックチェーンは未実装です。", ko: "시제품입니다. 샘플 데이터로 동작하며 서버 연동·결제·실제 OAuth 로그인·블록체인은 아직 구현되지 않았어요." },
  "settings.sampleData": { ja: "掲載している企業・人物・数値はすべてサンプルです。", ko: "표시되는 기업·인물·수치는 모두 샘플이에요." },
  "settings.disclaimerTitle": { ja: "ご注意", ko: "유의 사항" },
  "settings.repo": { ja: "ソースコード（GitHub）", ko: "소스 코드(GitHub)" },
} as const satisfies Record<string, LocalizedText>;
