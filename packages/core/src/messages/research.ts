// 연구 의뢰 문구: 연구자(대학원생) 화면 /lab/* · 기업의 연구 의뢰 /b2b/research/* · 응모자·대시보드의 연결 문구 (웹 데모).
// 운영 수수료는 의뢰비의 10%(최저 ¥9,000)를 기업이 따로 내요(fees.ts, 2026-11-08). 의뢰비는 기업이 연구자에게 직접 전액 지급해요(데모는 기록만).
import type { LocalizedText } from "../i18n";

export const research = {
  // 메뉴
  "lab.nav.find": { ja: "依頼を探す", ko: "의뢰 찾기" },
  "lab.nav.mine": { ja: "自分の研究", ko: "내 연구" },

  // 상태·분야·학년
  "research.status.open": { ja: "募集中", ko: "모집 중" },
  "research.status.inProgress": { ja: "研究中", ko: "연구 중" },
  "research.status.delivered": { ja: "確認待ち", ko: "확인 대기" },
  "research.status.completed": { ja: "完了", ko: "완료" },
  "research.field.environment": { ja: "環境・海洋", ko: "환경·해양" },
  "research.field.materials": { ja: "素材・化学", ko: "소재·화학" },
  "research.field.food": { ja: "食品・農学", ko: "식품·농학" },
  "research.field.energy": { ja: "エネルギー", ko: "에너지" },
  "research.field.data": { ja: "データ分析・統計", ko: "데이터 분석·통계" },
  "research.field.social": { ja: "社会調査・アンケート", ko: "사회조사·설문" },
  "research.degree.master": { ja: "修士{year}年", ko: "석사 {year}년차" },
  "research.degree.doctor": { ja: "博士{year}年", ko: "박사 {year}년차" },

  // 아이디어를 실현하기까지의 흐름 (기업·학생·대학원생 + 앱 밖의 제조·판로)
  "research.flow.title": { ja: "アイデアを形にするまでの流れ", ko: "아이디어를 실현하기까지의 흐름" },
  "research.flow.1": { ja: "企業がSDGsの課題と賞金を出す", ko: "기업이 SDGs 과제와 상금을 내요" },
  "research.flow.2": { ja: "学生がアイデアを出し、表彰されて賞金を受け取る", ko: "학생이 아이디어를 내고 표창받아 상금을 받아요" },
  "research.flow.3": { ja: "企業が、そのアイデアを形にするための研究を依頼する（依頼費）", ko: "기업이 그 아이디어를 실현하기 위한 연구를 의뢰해요(의뢰비)" },
  "research.flow.4": { ja: "大学院生が研究して成果を届け、依頼費を受け取る", ko: "대학원생이 연구해서 성과를 전하고 의뢰비를 받아요" },
  "research.flow.5": { ja: "製造・販路づくりは、企業ネットワークで信頼企業どうしが頼み合う（手数料なし）。銀行のビジネスマッチングも使える", ko: "제조 · 판로 만들기는 기업 네트워크에서 신뢰 기업끼리 서로 의뢰해요(수수료 없음). 은행의 비즈니스 매칭도 쓸 수 있어요" },

  // 기업이 돈을 내는 때 (「いつ・何に払うのか分からない」에 대한 답 — 기업 화면의 연구 의뢰 맨 위)
  "research.pay.title": { ja: "企業がお金を払うタイミング", ko: "기업이 돈을 내는 때" },
  "research.pay.prize": { ja: "表彰したとき：賞金（最優秀賞のチームへ直接・満額）＋手数料（賞金の10%・最低{min}）", ko: "표창할 때: 상금(최우수상 팀에게 직접 · 전액) + 수수료(상금의 10% · 최저 {min})" },
  "research.pay.match": { ja: "学生をインターンとして採用したとき：無料", ko: "학생을 인턴으로 채용할 때: 무료" },
  "research.pay.research": { ja: "研究の成果を確認したとき：依頼費（研究者へ直接・満額）＋手数料（依頼費の10%・最低{min}）", ko: "연구 성과를 확인할 때: 의뢰비(연구자에게 직접 · 전액) + 수수료(의뢰비의 10% · 최저 {min})" },
  "research.pay.network": { ja: "信頼を積んだ企業どうしの業務依頼：手数料なし", ko: "신뢰를 쌓은 기업끼리의 업무 의뢰: 수수료 없음" },
  "research.pay.note": { ja: "賞金・依頼費は相手へ直接お支払いいただき、当社はお金を預かりません。手数料は当社から別にご請求します。", ko: "상금·의뢰비는 상대에게 직접 지급하고, 운영사는 돈을 맡지 않아요. 수수료는 운영사가 따로 청구해요." },

  // 카드·상세의 공통 항목
  "research.fee": { ja: "依頼費", ko: "의뢰비" },
  "research.due": { ja: "納期", ko: "기한" },
  "research.dueOn": { ja: "{date}まで", ko: "{date}까지" },
  "research.overdue": { ja: "納期を過ぎています", ko: "기한이 지났어요" },
  "research.fields": { ja: "分野", ko: "분야" },
  "research.idea": { ja: "もとのアイデア", ko: "출발점 아이디어" },
  "research.ideaLine": { ja: "「{title}」（{team}）", ko: "「{title}」({team})" },
  "research.ideaWith": { ja: "もとのアイデア：{idea}", ko: "출발점 아이디어: {idea}" },
  "research.challengeWith": { ja: "アイデアが生まれた課題：{title}", ko: "아이디어가 나온 과제: {title}" },
  "research.mine": { ja: "あなたが担当", ko: "내가 담당" },
  "research.what": { ja: "研究してほしいこと", ko: "연구해 주었으면 하는 것" },
  "research.deliverable": { ja: "届けてほしい成果物", ko: "받고 싶은 성과물" },
  "research.postedOn": { ja: "掲載日", ko: "게재일" },
  "research.challenge": { ja: "アイデアが生まれた課題", ko: "아이디어가 나온 과제" },
  "research.progress": { ja: "進み具合", ko: "진행 상황" },
  "research.researcher": { ja: "担当の研究者", ko: "담당 연구자" },
  "research.otherResearcher": { ja: "ほかの研究者（サンプル）", ko: "다른 연구자(샘플)" },
  "research.researcherWith": { ja: "担当の研究者：{name}", ko: "담당 연구자: {name}" },
  "research.acceptedOn": { ja: "引き受けた日", ko: "맡은 날" },
  "research.completedOn": { ja: "完了した日", ko: "완료한 날" },
  "research.detailTitle": { ja: "研究依頼の詳細", ko: "연구 의뢰 상세" },
  "research.notFound": { ja: "この研究依頼は見つかりませんでした", ko: "이 연구 의뢰를 찾지 못했어요" },
  "research.back": { ja: "一覧に戻る", ko: "목록으로 돌아가기" },

  // 거래 조건 (맡기 전에 보여 줘요)
  "research.terms": { ja: "取引の条件", ko: "거래 조건" },
  "research.termsNote": { ja: "依頼の内容・依頼費・納期・支払いの方法は、引き受ける前にこの画面で確認できます。", ko: "의뢰 내용·의뢰비·기한·지급 방법은 맡기 전에 이 화면에서 확인할 수 있어요." },
  "research.payment": { ja: "支払い", ko: "지급" },
  "research.paymentValue": { ja: "企業が成果を確認したあと、企業から直接（デモでは記録だけ）", ko: "기업이 성과를 확인한 뒤 기업이 직접(데모에서는 기록만)" },
  "research.platformFee": { ja: "運営手数料", ko: "운영 수수료" },
  "research.platformFeeValue": { ja: "{fee}（依頼費の10%・最低{min}）を企業が別に支払います。依頼費は満額受け取れます", ko: "{fee}(의뢰비의 10% · 최저 {min})를 기업이 따로 내요. 의뢰비는 전액 받아요" },

  // 맡기 전에 확인할 것 (연구자)
  "research.checks.title": { ja: "引き受ける前に確認すること", ko: "맡기 전에 확인할 것" },
  "research.checks.university": {
    ja: "大学・研究室のルール（学外の仕事、設備や試薬の使い方）を確認し、必要なら指導教員に相談してください。",
    ko: "대학·연구실 규칙(학외 업무, 설비·시약 사용)을 확인하고, 필요하면 지도교수와 상의해 주세요.",
  },
  "research.checks.rights": {
    ja: "成果の権利（著作権・発明）と、論文などで公表してよい範囲は、引き受ける前に企業と書面で決めてください。",
    ko: "성과의 권리(저작권·발명)와 논문 등으로 공개해도 되는 범위는 맡기 전에 기업과 서면으로 정해 주세요.",
  },
  "research.checks.tax": {
    ja: "依頼費は所得として課税される場合があります。留学生の方は、引き受ける前に在留資格（資格外活動許可）を確認してください。",
    ko: "의뢰비는 소득으로 과세될 수 있어요. 유학생은 맡기 전에 체류 자격(자격외활동허가)을 확인해 주세요.",
  },

  // 연구자의 동작
  "research.accept": { ja: "この依頼を引き受ける", ko: "이 의뢰 맡기" },
  "research.acceptNote": {
    ja: "デモでは、押すとすぐに担当になります。実際のサービスでの決め方は、大学院生への調査のあとで決めます。",
    ko: "데모에서는 누르면 바로 담당이 돼요. 실제 서비스에서 정하는 방법은 대학원생 설문 뒤에 정해요.",
  },
  "research.accepted": { ja: "引き受けました。成果ができたら、この画面から届けてください。", ko: "맡았어요. 성과가 나오면 이 화면에서 보내 주세요." },
  "research.closedForYou": { ja: "納期を過ぎたため、この依頼は引き受けられません。", ko: "기한이 지나서 이 의뢰는 맡을 수 없어요." },
  "research.takenByOther": { ja: "この依頼は、ほかの研究者が担当しています。", ko: "이 의뢰는 다른 연구자가 맡고 있어요." },
  "research.submit.title": { ja: "成果を届ける", ko: "성과 보내기" },
  "research.submit.summary": { ja: "成果の要約", ko: "성과 요약" },
  "research.submit.summaryPh": { ja: "分かったこと・データの範囲・次に確かめるとよいことを短く書いてください", ko: "알게 된 것·데이터 범위·다음에 확인하면 좋을 것을 짧게 써 주세요" },
  "research.submit.file": { ja: "成果のファイル（PDF・PPTX・DOCX・XLSX・CSV・ZIP、50MBまで）", ko: "성과 파일(PDF·PPTX·DOCX·XLSX·CSV·ZIP, 50MB까지)" },
  "research.submit.fileNote": { ja: "デモでは、ファイルの名前と大きさだけを読みます（中身は読んだり送ったりしません）。", ko: "데모에서는 파일 이름과 크기만 읽어요(내용은 읽거나 보내지 않아요)." },
  "research.submit.sample": { ja: "サンプルの報告書を添付（デモ）", ko: "샘플 보고서 첨부(데모)" },
  "research.submit.chosen": { ja: "{name}（{size}）", ko: "{name}({size})" },
  "research.submit.button": { ja: "成果を届ける", ko: "성과 보내기" },
  "research.submit.done": { ja: "成果を届けました。企業の確認を待っています。", ko: "성과를 보냈어요. 기업의 확인을 기다리고 있어요." },
  "research.waiting": { ja: "企業の確認を待っています。確認が終わると、依頼費が支払われます。", ko: "기업의 확인을 기다리고 있어요. 확인이 끝나면 의뢰비가 지급돼요." },
  "research.paid": { ja: "完了しました。依頼費 {fee} を満額受け取りました（デモ：企業からの直接の振込）。", ko: "완료됐어요. 의뢰비 {fee}를 전액 받았어요(데모: 기업이 직접 이체)." },
  "research.result": { ja: "届いた成果", ko: "도착한 성과" },
  "research.resultFile": { ja: "ファイル", ko: "파일" },
  "research.resultAt": { ja: "届いた日時", ko: "보낸 시각" },
  "research.fingerprint": { ja: "ファイルの指紋（SHA-256）", ko: "파일 지문(SHA-256)" },

  // 입력 오류 (기업의 의뢰)
  "research.error.origin_invalid": { ja: "表彰・採用したアイデアを選んでください", ko: "표창·채택한 아이디어를 골라 주세요" },
  "research.error.title_required": { ja: "依頼のタイトルを入力してください", ko: "의뢰 제목을 입력해 주세요" },
  "research.error.title_too_long": { ja: "タイトルは{max}文字以内で入力してください", ko: "제목은 {max}자 이내로 입력해 주세요" },
  "research.error.detail_required": { ja: "研究してほしいことを入力してください", ko: "연구해 주었으면 하는 것을 입력해 주세요" },
  "research.error.detail_too_long": { ja: "研究してほしいことは{max}文字以内で入力してください", ko: "연구해 주었으면 하는 것은 {max}자 이내로 입력해 주세요" },
  "research.error.deliverable_required": { ja: "届けてほしい成果物を入力してください", ko: "받고 싶은 성과물을 입력해 주세요" },
  "research.error.deliverable_too_long": { ja: "成果物は{max}文字以内で入力してください", ko: "성과물은 {max}자 이내로 입력해 주세요" },
  "research.error.fields_required": { ja: "分野を1つ以上選んでください", ko: "분야를 하나 이상 골라 주세요" },
  "research.error.fields_too_many": { ja: "分野は{max}つまで選べます", ko: "분야는 {max}개까지 고를 수 있어요" },
  "research.error.fee_invalid": { ja: "依頼費は{min}〜{max}の金額を数字で入力してください", ko: "의뢰비는 {min}~{max} 금액을 숫자로 입력해 주세요" },
  "research.error.days_invalid": { ja: "納期は{min}〜{max}日後にしてください", ko: "기한은 {min}~{max}일 뒤로 해 주세요" },
  "research.error.contact_info": { ja: "メールアドレスや電話番号は書けません", ko: "이메일 주소나 전화번호는 쓸 수 없어요" },

  // 입력 오류 (연구자의 성과)
  "research.resultError.summary_required": { ja: "成果の要約を入力してください", ko: "성과 요약을 입력해 주세요" },
  "research.resultError.summary_too_long": { ja: "要約は{max}文字以内で入力してください", ko: "요약은 {max}자 이내로 입력해 주세요" },
  "research.resultError.file_required": { ja: "成果のファイルを添付してください", ko: "성과 파일을 첨부해 주세요" },
  "research.resultError.file_type": { ja: "PDF・PPTX・DOCX・XLSX・CSV・ZIPのファイルを選んでください", ko: "PDF·PPTX·DOCX·XLSX·CSV·ZIP 파일을 골라 주세요" },
  "research.resultError.file_too_large": { ja: "ファイルは{max}までです", ko: "파일은 {max}까지예요" },

  // 연구자 홈 (/lab/)
  "lab.title": { ja: "研究依頼を探す", ko: "연구 의뢰 찾기" },
  "lab.intro": {
    ja: "企業が、学生のアイデアを形にするための研究を依頼しています。引き受けて成果を届けると、依頼費を受け取れます（デモ）。",
    ko: "기업이 학생 아이디어를 실현하기 위한 연구를 의뢰하고 있어요. 맡아서 성과를 전하면 의뢰비를 받을 수 있어요(데모).",
  },
  "lab.filterLabel": { ja: "分野で絞り込む", ko: "분야로 좁히기" },
  "lab.filter.all": { ja: "すべて", ko: "전체" },
  "lab.openTitle": { ja: "募集中の研究依頼", ko: "모집 중인 연구 의뢰" },
  "lab.openEmpty": { ja: "いま募集中の依頼はありません", ko: "지금 모집 중인 의뢰가 없어요" },
  "lab.openEmptyField": { ja: "この分野で募集中の依頼はありません", ko: "이 분야에서 모집 중인 의뢰가 없어요" },
  "lab.mineLink": { ja: "研究中の依頼 {count}件", ko: "연구 중인 의뢰 {count}건" },

  // 연구자의 내 연구 (/lab/mine/)
  "lab.mine.title": { ja: "自分の研究", ko: "내 연구" },
  "lab.mine.received": { ja: "受け取った依頼費", ko: "받은 의뢰비" },
  "lab.mine.group.inProgress": { ja: "研究中", ko: "연구 중" },
  "lab.mine.group.delivered": { ja: "企業の確認待ち", ko: "기업 확인 대기" },
  "lab.mine.group.completed": { ja: "完了", ko: "완료" },
  "lab.mine.empty": { ja: "まだありません", ko: "아직 없어요" },
  "lab.mine.note": { ja: "依頼費は、企業が成果を確認したあとで企業から直接受け取ります（デモでは記録だけ）。", ko: "의뢰비는 기업이 성과를 확인한 뒤 기업에게서 직접 받아요(데모에서는 기록만)." },

  // 연구자 프로필 (설정)
  "lab.profile.title": { ja: "研究者プロフィール（デモ）", ko: "연구자 프로필(데모)" },
  "lab.profile.name": { ja: "ニックネーム", ko: "닉네임" },
  "lab.profile.affiliation": { ja: "所属", ko: "소속" },
  "lab.profile.degree": { ja: "学年", ko: "학년" },
  "lab.profile.fields": { ja: "研究分野", ko: "연구 분야" },

  // 기업의 연구 의뢰 (/b2b/research/)
  "research.b2b.title": { ja: "研究依頼", ko: "연구 의뢰" },
  "research.b2b.new": { ja: "研究を依頼する", ko: "연구 의뢰하기" },
  "research.b2b.intro": { ja: "表彰・採用したアイデアを形にするため、大学院生の研究者に研究を依頼できます。", ko: "표창·채택한 아이디어를 실현하려고 대학원생 연구자에게 연구를 의뢰할 수 있어요." },
  "research.b2b.posted": { ja: "研究依頼を掲載しました。大学院生の研究者の画面に表示されます（デモ）。", ko: "연구 의뢰를 게재했어요. 대학원생 연구자 화면에 보여요(데모)." },
  "research.b2b.empty": { ja: "まだ研究依頼はありません", ko: "아직 연구 의뢰가 없어요" },
  "research.b2b.paid": { ja: "支払った依頼費", ko: "지급한 의뢰비" },
  "research.b2b.waitingResearcher": { ja: "引き受ける研究者を待っています。", ko: "맡을 연구자를 기다리고 있어요." },
  "research.b2b.researching": { ja: "研究者が研究しています。成果が届くと、ここに表示されます。", ko: "연구자가 연구하고 있어요. 성과가 도착하면 여기에 보여요." },
  "research.b2b.complete": { ja: "成果を確認して完了にする", ko: "성과를 확인하고 완료하기" },
  "research.b2b.completeConfirm": {
    ja: "成果を確認しましたか？完了にしたら、依頼費 {fee} を研究者に直接お支払いください（デモでは記録だけ）。手数料 {platformFee} は当社から別にご請求します。",
    ko: "성과를 확인했나요? 완료하면 의뢰비 {fee}를 연구자에게 직접 지급해 주세요(데모에서는 기록만). 수수료 {platformFee}은 운영사가 따로 청구해요.",
  },
  "research.b2b.completed": { ja: "完了しました。依頼費 {fee} の支払いと、手数料 {platformFee} を記録しました（デモ）。", ko: "완료했어요. 의뢰비 {fee} 지급과 수수료 {platformFee}을 기록했어요(데모)." },
  "research.b2b.feeNote": {
    ja: "依頼費は、成果を確認したあとで研究者へ直接、満額お支払いください（デモでは記録だけ）。当社の手数料は依頼費の10%（最低{min}）を別にご請求します。",
    ko: "의뢰비는 성과를 확인한 뒤 연구자에게 직접 전액 지급해 주세요(데모에서는 기록만). 운영사 수수료는 의뢰비의 10%(최저 {min})를 따로 청구해요.",
  },
  "research.b2b.noIdeas": {
    ja: "研究を依頼できるアイデアがまだありません。応募者の画面でアイデアを表彰・採用すると、ここから依頼できます。",
    ko: "연구를 의뢰할 수 있는 아이디어가 아직 없어요. 응모자 화면에서 아이디어를 표창·채택하면 여기서 의뢰할 수 있어요.",
  },
  "research.b2b.count": { ja: "研究依頼 {count}件", ko: "연구 의뢰 {count}건" },
  "research.b2b.summary": { ja: "募集中 {open}件・研究中 {active}件・確認待ち {delivered}件", ko: "모집 중 {open}건 · 연구 중 {active}건 · 확인 대기 {delivered}건" },
  "research.b2b.go": { ja: "研究依頼を見る", ko: "연구 의뢰 보기" },

  // 기업의 새 의뢰 (/b2b/research/new/)
  "research.new.title": { ja: "研究を依頼する", ko: "연구 의뢰하기" },
  "research.new.idea": { ja: "形にしたいアイデア（表彰・採用したもの）", ko: "실현하고 싶은 아이디어(표창·채택한 것)" },
  "research.new.requestTitle": { ja: "依頼のタイトル", ko: "의뢰 제목" },
  "research.new.titlePh": { ja: "例：紙と生分解樹脂のパッケージを、強度と1個あたりの費用で比べる", ko: "예: 종이와 생분해 수지 포장을 강도와 개당 비용으로 비교" },
  "research.new.detailPh": { ja: "何を・どこまで調べてほしいか、使える資料やデータを書いてください", ko: "무엇을·어디까지 조사해 주었으면 하는지, 쓸 수 있는 자료나 데이터를 써 주세요" },
  "research.new.deliverablePh": { ja: "例：比較の報告書（PDF）と、試験・費用のデータ（XLSX）", ko: "예: 비교 보고서(PDF)와 시험·비용 데이터(XLSX)" },
  "research.new.fields": { ja: "分野（{max}つまで）", ko: "분야({max}개까지)" },
  "research.new.fee": { ja: "依頼費（円）", ko: "의뢰비(엔)" },
  "research.new.feeHint": { ja: "研究者に満額支払う金額です（{min}〜{max}）。当社の手数料は、この10%（最低{feeMin}）を別にご請求します。", ko: "연구자에게 전액 지급하는 금액이에요({min}~{max}). 운영사 수수료는 이 금액의 10%(최저 {feeMin})를 따로 청구해요." },
  "research.new.days": { ja: "納期（掲載日から何日後）", ko: "기한(게재일부터 며칠 뒤)" },
  "research.new.daysHint": { ja: "{min}〜{max}日", ko: "{min}~{max}일" },
  "research.new.termsNote": {
    ja: "依頼の内容・依頼費・納期・支払いの方法は、研究者が引き受ける前に確認できるように表示されます。",
    ko: "의뢰 내용·의뢰비·기한·지급 방법은 연구자가 맡기 전에 확인할 수 있게 보여요.",
  },
  "research.new.submit": { ja: "研究依頼を掲載する", ko: "연구 의뢰 게재하기" },
} as const satisfies Record<string, LocalizedText>;
