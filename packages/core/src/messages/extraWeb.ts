// 웹 앱(apps/web)에서만 쓰는 추가 문구. 공용 사전(common·b2c·b2b·settings)에 없는 글자가 필요할 때 여기에 {ja, ko} 한 쌍으로 더해요.
// 키는 모두 "web." 로 시작해요. 일본어에는 한글이, 한국어에는 가나가 섞이지 않게 해 주세요(messages.test.ts 가 확인해요).
import type { LocalizedText } from "../i18n";

export const extraWeb = {
  // 화면 틀·접근성
  "web.skip": { ja: "本文へスキップ", ko: "본문으로 건너뛰기" },
  "web.nav.main": { ja: "メインメニュー", ko: "메인 메뉴" },
  "web.lang.label": { ja: "言語", ko: "언어" },
  "web.roleShort.b2c": { ja: "学生", ko: "학생" },
  "web.roleShort.b2b": { ja: "企業", ko: "기업" },
  "web.roleShort.researcher": { ja: "研究者", ko: "연구자" },
  // 역할 칩: 누르면 역할 선택 화면(학생·기업·연구자)으로 가요
  "web.role.switch": { ja: "利用タイプを切り替える（いまは{role}）", ko: "이용 유형 전환(지금은 {role})" },
  "web.settings.roleNote": { ja: "学生・企業・研究者（大学院生）の画面を切り替えて、一連の流れを確認できます。", ko: "학생·기업·연구자(대학원생) 화면을 바꿔 가며 전체 흐름을 확인할 수 있어요." },

  // 챌린지 상세
  "web.challenge.detail": { ja: "課題の詳細", ko: "챌린지 상세" },

  // 기획서 제출·응모자 화면
  "web.submit.step": { ja: "{total}ステップ中 {current}ステップ目", ko: "{total}단계 중 {current}단계" },
  "web.applicants.file": { ja: "ファイル", ko: "파일" },
  "web.applicants.video": { ja: "動画を見る", ko: "동영상 보기" },
  "web.review.awardKind": { ja: "賞の種類", ko: "상의 종류" },

  // SNS 카드뉴스
  "web.share.caption": { ja: "投稿用キャプション", ko: "게시용 캡션" },
  "web.share.copy": { ja: "キャプションをコピー", ko: "캡션 복사" },
  "web.share.copyDone": { ja: "キャプションをコピーしました", ko: "캡션을 복사했어요" },
  "web.share.copyFail": { ja: "コピーできませんでした。キャプションを選択して手動でコピーしてください。", ko: "복사하지 못했어요. 캡션을 선택해서 직접 복사해 주세요." },
  // 다른 사이트(공식 SNS)로 가는 링크 옆에 숨겨 두는 글자 — 읽어 주는 도구가 새 탭으로 열린다는 것을 알려요
  "web.newTab": { ja: "（新しいタブで開きます）", ko: "(새 탭에서 열려요)" },
  "web.share.shared": { ja: "共有しました", ko: "공유했어요" },

  // 설정
  "web.settings.scout": { ja: "スカウトの受信", ko: "스카우트 수신" },
  "web.settings.resetConfirm": { ja: "本当にリセットしますか？ 入力した内容はすべて消えて、最初のサンプル状態に戻ります。", ko: "정말 초기화할까요? 입력한 내용이 모두 지워지고 처음 샘플 상태로 돌아가요." },

  // 인재 스카우트(기업)
  "web.talent.demoStudent": { ja: "デモ：学生画面のあなた", ko: "데모: 학생 화면의 나" },
  "web.talent.count": { ja: "{count}名の人材", ko: "{count}명의 인재" },
  "web.talent.messageRequired": { ja: "メッセージを入力してください", ko: "메시지를 입력해 주세요" },

  // ESG 리포트·인증마크(기업)
  "web.esg.target": { ja: "満点の目安：{value}", ko: "만점 기준: {value}" },
  "web.esg.flagOn": { ja: "公開している", ko: "공개하고 있어요" },
  "web.esg.flagOff": { ja: "公開していない", ko: "공개하지 않아요" },
  "web.esg.categories": { ja: "領域別の達成度", ko: "영역별 달성도" },
  "web.esg.criteria": { ja: "マークの設問", ko: "마크 문항" },
  "web.esg.print": { ja: "PDFで保存・印刷", ko: "PDF로 저장·인쇄" },
  "web.esg.reportHint": { ja: "「レポートを生成」を押すと、現在の入力内容でレポートが表示されます。", ko: "\"리포트 생성\"을 누르면 지금 입력한 내용으로 리포트가 표시돼요." },
} as const satisfies Record<string, LocalizedText>;
