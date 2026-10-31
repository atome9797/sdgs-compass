// 모바일 앱(apps/mobile)에서만 쓰는 추가 문구. 공용 사전에 없는 글자가 필요할 때 여기에 {ja, ko} 한 쌍으로 더해요.
// 키는 모두 "mobile.이름" 형식이에요 (웹 전용은 extraWeb.ts).
import type { LocalizedText } from "../i18n";

export const extraMobile = {
  // 첫 화면(언어 선택)·머리글
  "mobile.langSuggested": { ja: "端末の言語に合わせたおすすめ", ko: "기기 언어에 맞춘 추천" },
  "mobile.headerLanguage": { ja: "表示言語", ko: "표시 언어" },
  "mobile.roleSwitchLabel": { ja: "利用タイプ：{current}。{target}に切り替える", ko: "이용 유형: {current}. {target}(으)로 전환" },
  "mobile.tabsUnread": { ja: "{label}、未読{count}件", ko: "{label}, 읽지 않은 메시지 {count}건" },
  "mobile.notFoundBack": { ja: "ホームへ戻る", ko: "홈으로 돌아가기" },
  // 아래 탭 이름은 한 줄에 들어가야 해서 짧게 (기업 쪽 첫 탭 "ダッシュボード"는 휴대폰 너비에 넘쳐요)
  "mobile.tabDashboard": { ja: "ホーム", ko: "대시보드" },

  // 홈·챌린지 상세
  "mobile.reasonsTitle": { ja: "おすすめの理由", ko: "추천 이유" },
  "mobile.challengeSkills": { ja: "歓迎スキル", ko: "환영 스킬" },
  "mobile.companyVerified": { ja: "確認済みの企業（サンプル）", ko: "확인된 기업(샘플)" },

  // 기획서 제출
  "mobile.stepOf": { ja: "ステップ {current}/{total}", ko: "단계 {current}/{total}" },
  "mobile.teamSolo": { ja: "個人で応募（ニックネームを使う）", ko: "개인으로 응모(닉네임 사용)" },
  "mobile.sampleHint": { ja: "デモ用の見本ファイルです（実際のアップロードは行いません）", ko: "데모용 샘플 파일이에요(실제 업로드는 하지 않아요)" },
  "mobile.sampleInvalid": { ja: "形式エラーの例", ko: "형식 오류 예시" },
  "mobile.errorsTitle": { ja: "入力内容を確認してください", ko: "입력 내용을 확인해 주세요" },

  // 시연용 샘플 입력 (무대에서 긴 글을 치지 않아도 되게)
  "mobile.fillSample": { ja: "サンプル文を入力（デモ）", ko: "샘플 문구 채우기(데모)" },

  // 증명서·카드뉴스
  "mobile.tamperedNow": { ja: "改ざんテスト中：内容を一部変更したコピーを表示しています", ko: "위조 테스트 중: 내용을 일부 바꾼 사본을 보여 주고 있어요" },
  "mobile.templateLabel": { ja: "テンプレート", ko: "템플릿" },
  "mobile.preview": { ja: "プレビュー", ko: "미리보기" },
  "mobile.captionLabel": { ja: "投稿文", ko: "게시글" },
  "mobile.shareDone": { ja: "共有メニューを開きました", ko: "공유 메뉴를 열었어요" },

  // 설정
  "mobile.scoutSetting": { ja: "スカウトの受信", ko: "스카우트 수신" },
  "mobile.resetConfirm": {
    ja: "入力した内容をすべて消して、言語の選択から最初のサンプル状態に戻します。よろしいですか？",
    ko: "입력한 내용을 모두 지우고 언어 선택부터 처음 샘플 상태로 되돌려요. 계속할까요?",
  },

  // 기업(B2B): 새 챌린지·응모자·인재·ESG
  "mobile.daysValue": { ja: "{days}日", ko: "{days}일" },
  "mobile.daysRange": { ja: "{min}〜{max}日の範囲で設定できます", ko: "{min}~{max}일 범위에서 설정할 수 있어요" },
  "mobile.decrease": { ja: "減らす", ko: "줄이기" },
  "mobile.increase": { ja: "増やす", ko: "늘리기" },
  "mobile.goToDashboard": { ja: "ダッシュボードへ", ko: "대시보드로" },
  "mobile.openVideo": { ja: "動画を開く", ko: "동영상 열기" },
  "mobile.awardKind": { ja: "表彰の種類", ko: "시상 종류" },
  "mobile.talentDemoStudent": { ja: "学生画面のあなた（デモ）", ko: "학생 화면의 나(데모)" },
  "mobile.talentCount": { ja: "{count}名の人材", ko: "{count}명의 인재" },
  "mobile.messageRequired": { ja: "メッセージを入力してください", ko: "메시지를 입력해 주세요" },
  "mobile.esgTarget": { ja: "満点の目安：{target}{unit}", ko: "만점 기준: {target}{unit}" },
  "mobile.esgFlagOn": { ja: "公開している", ko: "공개하고 있어요" },
  "mobile.esgFlagOff": { ja: "公開していない", ko: "공개하지 않아요" },
  "mobile.esgCategories": { ja: "領域別の達成度", ko: "영역별 달성도" },
  "mobile.esgCriteria": { ja: "マークの設問", ko: "마크 문항" },
  "mobile.esgReportHint": {
    ja: "「レポートを生成」を押すと、現在の入力内容でレポートが表示されます。",
    ko: "\"리포트 생성\"을 누르면 지금 입력한 내용으로 리포트가 표시돼요.",
  },
} as const satisfies Record<string, LocalizedText>;
