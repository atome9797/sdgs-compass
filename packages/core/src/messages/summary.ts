// 학생용 신청 요약(#22) 문구: 대학의 활동 장려 제도 등에 신청할 때 붙이는 "활동 기록 자료" 한 장.
// 앱은 장학금을 주지 않고 대학·단체와 제휴하지 않았어요. 그래서 "지급·제휴·보장"으로 읽히는 말을 쓰지 않고, 고지 문장을 늘 함께 보여 줘요.
import type { LocalizedText } from "../i18n";

export const summary = {
  // ───────── 화면 ─────────
  "summary.entry": { ja: "申請用のまとめを作る", ko: "신청용 요약 만들기" },
  "summary.title": { ja: "申請用のまとめ", ko: "신청용 요약" },
  "summary.lead": {
    ja: "大学の活動奨励制度などに申請するとき、添付資料として使える活動の記録を1枚にまとめます。",
    ko: "대학의 활동 장려 제도 등에 신청할 때 첨부 자료로 쓸 수 있는 활동 기록을 한 장으로 정리해요.",
  },
  "summary.period.label": { ja: "まとめる期間", ko: "정리할 기간" },
  "summary.period.all": { ja: "全期間", ko: "전체 기간" },
  "summary.period.year": { ja: "直近1年", ko: "최근 1년" },
  "summary.period.half": { ja: "直近6か月", ko: "최근 6개월" },
  "summary.print": { ja: "印刷・PDFで保存", ko: "인쇄·PDF로 저장" },
  "summary.printHint": {
    ja: "印刷画面の送信先で「PDFに保存」を選ぶと、PDFファイルとして保存できます。",
    ko: "인쇄 화면의 대상에서 'PDF로 저장'을 고르면 PDF 파일로 저장할 수 있어요.",
  },
  "summary.preview": { ja: "印刷イメージ（A4・1枚）", ko: "인쇄 미리보기(A4 · 한 장)" },
  "summary.share": { ja: "テキストで共有", ko: "텍스트로 공유" },
  "summary.pdfOnWeb": { ja: "PDFはWeb版から保存できます。", ko: "PDF는 웹 버전에서 저장할 수 있어요." },

  // ───────── 한 장 (인쇄되는 부분) ─────────
  "summary.docTitle": { ja: "SDGsコンパス 活動記録のまとめ", ko: "SDGs 컴파스 활동 기록 요약" },
  "summary.createdOn": { ja: "作成日 {date}", ko: "작성일 {date}" },
  "summary.range": { ja: "{from} 〜 {to}", ko: "{from} ~ {to}" },
  "summary.rangeAll": { ja: "全期間（〜 {to}）", ko: "전체 기간(~ {to})" },
  "summary.holder.name": { ja: "表示名", ko: "표시 이름" },
  "summary.holder.affiliation": { ja: "所属", ko: "소속" },
  "summary.holder.level": { ja: "レベル・累計ポイント", ko: "레벨 · 누적 포인트" },
  "summary.holder.period": { ja: "対象期間", ko: "대상 기간" },
  "summary.stat.participations": { ja: "参加", ko: "참가" },
  "summary.stat.submissions": { ja: "企画書の提出", ko: "기획서 제출" },
  "summary.stat.awards": { ja: "受賞", ko: "수상" },
  "summary.stat.points": { ja: "期間中のポイント", ko: "기간 중 포인트" },
  "summary.count": { ja: "{n}件", ko: "{n}건" },
  "summary.activities.title": { ja: "活動の記録", ko: "활동 기록" },
  "summary.activities.date": { ja: "日付", ko: "날짜" },
  "summary.activities.kind": { ja: "種類", ko: "종류" },
  "summary.activities.subject": { ja: "課題・企業", ko: "챌린지·기업" },
  "summary.activities.sdgs": { ja: "SDGs", ko: "SDGs" },
  "summary.activities.more": { ja: "ほか {n}件（アプリの活動履歴で確認できます）", ko: "외 {n}건(앱의 활동 기록에서 확인할 수 있어요)" },
  "summary.activities.empty": { ja: "この期間の活動はありません。期間を広げてください。", ko: "이 기간의 활동이 없어요. 기간을 넓혀 보세요." },
  "summary.sdgs.title": { ja: "関わったSDGs", ko: "관련 SDGs" },
  "summary.sdgs.empty": { ja: "この期間に関わったSDGsはありません。", ko: "이 기간에 관련된 SDGs가 없어요." },
  "summary.certs.title": { ja: "デジタル証明書", ko: "디지털 증명서" },
  "summary.certs.code": { ja: "確認コード {code}", ko: "확인 코드 {code}" },
  "summary.certs.qrLabel": { ja: "証明書 {id} のQRコード", ko: "증명서 {id}의 QR 코드" },
  "summary.certs.more": { ja: "ほか {n}件（アプリの証明書画面で確認できます）", ko: "외 {n}건(앱의 증명서 화면에서 확인할 수 있어요)" },
  "summary.certs.empty": { ja: "この期間に発行できる証明書はありません。", ko: "이 기간에 발급할 수 있는 증명서가 없어요." },
  "summary.notes.title": { ja: "この資料について", ko: "이 자료에 대해" },
  "summary.note.record": {
    ja: "この資料は、本アプリでの活動の記録です。奨学金や制度への採用を保証するものではありません。",
    ko: "이 자료는 이 앱에서의 활동 기록이에요. 장학금이나 제도 선정을 보장하지 않아요.",
  },
  "summary.note.check": {
    ja: "提出先の大学・団体の募集要項で、受け付ける資料の形式を確認してください。",
    ko: "제출처 대학·단체의 모집 요강에서 받는 자료의 형식을 확인해 주세요.",
  },
  "summary.note.partner": { ja: "本アプリは大学・団体と提携していません。", ko: "이 앱은 대학·단체와 제휴하지 않았어요." },
  "summary.note.qr": {
    ja: "QRコードは表示用のデモです。読み取りによる検証はPhase 2で対応します。",
    ko: "QR 코드는 표시용 데모예요. 읽어서 검증하는 기능은 Phase 2에서 지원해요.",
  },
  "summary.note.sample": { ja: "デモ用のサンプルデータです。", ko: "데모용 샘플 데이터예요." },

  // ───────── 글로 공유 (모바일 Share) ─────────
  "summary.text.holder": { ja: "表示名：{name}（{affiliation}）", ko: "표시 이름: {name}({affiliation})" },
  "summary.text.range": { ja: "対象期間：{range}", ko: "대상 기간: {range}" },
  "summary.text.counts": {
    ja: "参加 {participations}件・企画書の提出 {submissions}件・受賞 {awards}件・ポイント {points}",
    ko: "참가 {participations}건 · 기획서 제출 {submissions}건 · 수상 {awards}건 · 포인트 {points}",
  },
  "summary.text.activities": { ja: "活動の記録：", ko: "활동 기록:" },
  "summary.text.certs": { ja: "デジタル証明書：", ko: "디지털 증명서:" },
} as const satisfies Record<string, LocalizedText>;
