// #25 リワード残高(데모) 문구: 학생 화면(잔액·내역·본인 확인·출금 신청·고지)과 기업 화면(상금 예치·송금·반환)
// 이름은 설계서(2026-11-01 사용자 결정)를 따라요: 「リワード残高」/「보상 잔액」, 「企業の賞金」, 「運営からの還元」, 「出金」, 「賞金の返金（企業へ）」.
import type { LocalizedText } from "../i18n";

export const wallet = {
  "wallet.title": { ja: "リワード残高", ko: "보상 잔액" },
  "wallet.demo": { ja: "デモ", ko: "데모" },
  "wallet.balance": { ja: "残高", ko: "잔액" },
  "wallet.more": { ja: "詳しく", ko: "자세히" },
  "wallet.back": { ja: "インパクトに戻る", ko: "임팩트로 돌아가기" },
  "wallet.cardNote": { ja: "企業の賞金と運営からの還元を受け取る残高です（デモ）", ko: "기업 상금과 운영 환원을 받는 잔액이에요(데모)" },
  "wallet.totals": { ja: "受け取り {received}（賞金 {prize}・還元 {ret}）／出金 {withdrawn}", ko: "받은 금액 {received}(상금 {prize}·환원 {ret}) / 출금 {withdrawn}" },

  // 고지 ①~④ (화면에 늘 보여요)
  "wallet.notice.registration": {
    ja: "リワード残高は、当社が第二種資金移動業の登録を受けた後に提供する予定の機能です（デモ）。",
    ko: "보상 잔액은 운영사가 제2종 자금이동업 등록을 받은 뒤에 제공할 예정인 기능이에요(데모).",
  },
  "wallet.notice.kyc": { ja: "出金には本人確認が必要です。1回100万円まで。", ko: "출금하려면 본인 확인이 필요해요. 1회 100만 엔까지예요." },
  "wallet.notice.tax": {
    ja: "賞金・還元は所得として課税される場合があります（確定申告が必要なことがあります）。留学生の方は、受け取る前に在留資格（資格外活動許可）を確認してください。",
    ko: "상금·환원은 소득으로 과세될 수 있어요(확정신고가 필요할 수 있어요). 유학생은 받기 전에 체류 자격(자격외활동허가)을 확인해 주세요.",
  },
  "wallet.notice.level": { ja: "インパクトレベルは換金できません。リワード残高とは別のものです。", ko: "임팩트 레벨은 돈으로 바꿀 수 없어요. 보상 잔액과는 별개예요." },
  "wallet.noticesTitle": { ja: "ご注意", ko: "꼭 읽어 주세요" },

  // 내역
  "wallet.history": { ja: "入出金の履歴", ko: "입출금 내역" },
  "wallet.historyEmpty": { ja: "まだ履歴はありません", ko: "아직 내역이 없어요" },
  "wallet.kind.prize": { ja: "企業の賞金", ko: "기업 상금" },
  "wallet.kind.return": { ja: "運営からの還元", ko: "운영 환원" },
  "wallet.kind.withdrawal": { ja: "出金", ko: "출금" },
  "wallet.prizeTitle": { ja: "{company}「{title}」{award}", ko: "{company} 「{title}」 {award}" },
  "wallet.toBank": { ja: "銀行口座へ", ko: "은행 계좌로" },
  "wallet.status.requested": { ja: "申請中（デモ）", ko: "신청됨(데모)" },

  // 본인 확인
  "wallet.kyc.title": { ja: "本人確認", ko: "본인 확인" },
  "wallet.kyc.none": { ja: "未完了", ko: "아직 안 했어요" },
  "wallet.kyc.verified": { ja: "完了（{date}）", ko: "완료({date})" },
  "wallet.kyc.button": { ja: "本人確認を完了する（デモ）", ko: "본인 확인 완료하기(데모)" },
  "wallet.kyc.hint": {
    ja: "実際のサービスでは、身分証とスマートフォンでオンライン本人確認（eKYC）を行い、振込先の口座を登録します。デモではボタンで完了し、口座は登録しません。",
    ko: "실제 서비스에서는 신분증과 스마트폰으로 온라인 본인 확인(eKYC)을 하고 입금받을 계좌를 등록해요. 데모에서는 버튼으로 완료되고 계좌는 등록하지 않아요.",
  },

  // 출금 신청
  "wallet.withdraw.title": { ja: "出金を申請する", ko: "출금 신청" },
  "wallet.withdraw.amount": { ja: "出金する金額（円）", ko: "출금할 금액(엔)" },
  "wallet.withdraw.hint": { ja: "1円以上・残高（{balance}）以下・1回{max}まで", ko: "1엔 이상 · 잔액({balance}) 이하 · 1회 {max}까지" },
  "wallet.withdraw.submit": { ja: "出金を申請する", ko: "출금 신청하기" },
  "wallet.withdraw.needKyc": { ja: "本人確認を完了すると、出金を申請できます。", ko: "본인 확인을 마치면 출금을 신청할 수 있어요." },
  "wallet.withdraw.done": { ja: "申請を受け付けました（デモ：実際の送金は行いません）", ko: "신청을 접수했어요(데모: 실제로 송금하지 않아요)" },
  "wallet.error.kyc_required": { ja: "先に本人確認を完了してください", ko: "먼저 본인 확인을 완료해 주세요" },
  "wallet.error.invalid_amount": { ja: "1円以上の金額を数字で入力してください", ko: "1엔 이상의 금액을 숫자로 입력해 주세요" },
  "wallet.error.over_limit": { ja: "1回に出金できるのは{max}までです", ko: "1회에 출금할 수 있는 금액은 {max}까지예요" },
  "wallet.error.over_balance": { ja: "残高（{balance}）を超えています", ko: "잔액({balance})을 넘었어요" },

  // 받을 수 있는 돈의 구조
  "wallet.about.title": { ja: "受け取れるお金のしくみ", ko: "받을 수 있는 돈의 구조" },
  "wallet.about.prize": {
    ja: "企業の賞金：企業が課題を出すときに当社へ預けた賞金を、最優秀賞のチームのリワード残高へ送金します。",
    ko: "기업 상금: 기업이 과제를 낼 때 운영사에 맡긴 상금을 최우수상 팀의 보상 잔액으로 보내요.",
  },
  "wallet.about.return": {
    ja: "運営からの還元：各期末に運転資金3か月分を残し、その期の経常利益の残りを、事前に公開した基準（受賞・提出などの実績。作業時間や量ではありません）で配分します。",
    ko: "운영 환원: 각 기 말에 운전자금 3개월분을 남기고, 그 기 경상이익의 나머지를 미리 공개한 기준(수상·제출 등 실적. 작업 시간이나 양이 아니에요)으로 나눠요.",
  },
  "wallet.about.noBuy": {
    ja: "残高は購入（チャージ）や他の人への譲渡はできず、利息もつきません。",
    ko: "잔액은 충전(구매)하거나 다른 사람에게 넘길 수 없고, 이자도 붙지 않아요.",
  },

  // 기업 화면: 상금 예치·송금·반환
  "prize.newNote": {
    ja: "賞金は当社に預け入れ、受賞者のリワード残高へ送金されます（資金移動業の登録後）",
    ko: "상금은 운영사에 맡기고, 수상자의 보상 잔액으로 송금돼요(자금이동업 등록 후)",
  },
  "prize.section": { ja: "賞金の預け入れ（デモ）", ko: "상금 예치(데모)" },
  "prize.kpiDeposited": { ja: "預け入れ中の賞金", ko: "예치 중인 상금" },
  "prize.kpiPaid": { ja: "送金済みの賞金", ko: "송금한 상금" },
  "prize.kpiRefunded": { ja: "賞金の返金（企業へ）", ko: "상금 반환(기업에)" },
  "prize.status.deposited": { ja: "預け入れ中", ko: "예치 중" },
  "prize.status.paid": { ja: "送金済み", ko: "송금 완료" },
  "prize.status.refunded": { ja: "返金済み（企業へ）", ko: "반환 완료(기업에)" },
  "prize.col.challenge": { ja: "課題", ko: "과제" },
  "prize.col.amount": { ja: "賞金", ko: "상금" },
  "prize.col.status": { ja: "状態", ko: "상태" },
  "prize.col.date": { ja: "日付", ko: "날짜" },
  "prize.companyNote": {
    ja: "賞金の預け入れ・送金は、当社が第二種資金移動業の登録を受けた後に提供する予定の機能です（デモ）。登録までは、賞金は企業から受賞者へ直接お支払いいただきます。",
    ko: "상금 예치·송금은 운영사가 제2종 자금이동업 등록을 받은 뒤에 제공할 예정인 기능이에요(데모). 등록 전까지 상금은 기업이 수상자에게 직접 지급해요.",
  },
  "prize.refundNote": {
    ja: "最優秀賞を決めずに課題を終えたときは、預けた賞金を企業へ返金します。",
    ko: "최우수상을 정하지 않고 과제를 마치면 맡긴 상금을 기업에 돌려드려요.",
  },
  "prize.applicants.deposited": {
    ja: "最優秀賞を決めると、預け入れた賞金 {amount} を受賞者のリワード残高へ送金します（デモ）",
    ko: "최우수상을 정하면 맡긴 상금 {amount}을 수상자의 보상 잔액으로 보내요(데모)",
  },
  "prize.applicants.paid": { ja: "賞金 {amount} を「{team}」のリワード残高へ送金しました（デモ）", ko: "상금 {amount}을 「{team}」의 보상 잔액으로 보냈어요(데모)" },
  "prize.applicants.paidWinner": { ja: "賞金 {amount} を受賞者のリワード残高へ送金しました（デモ）", ko: "상금 {amount}을 수상자의 보상 잔액으로 보냈어요(데모)" },
  "prize.applicants.refunded": { ja: "賞金 {amount} は企業へ返金しました", ko: "상금 {amount}은 기업에 돌려드렸어요" },
} as const satisfies Record<string, LocalizedText>;
