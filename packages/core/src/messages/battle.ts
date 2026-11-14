// 퀘스트 전투 화면(#38)의 메시지 창 · 명령 메뉴 문구. 해설은 옛 RPG 처럼 띄어 쓰고(「〜が あらわれた！」 같은 흔한 말투만),
// 의뢰한 기업의 말과 「しらべる」의 선택지(#41)는 게임을 하지 않는 사람도 바로 알 수 있는 쉬운 말로 써요. 다른 게임의 대사를 그대로 쓰지 않아요.
// 한국어는 받침에 따라 조사가 바뀌지 않게 「출현!」 「격파!」 「…: …」처럼 조사 없이 끝나는 말을 써요.
import type { LocalizedText } from "../i18n";

export const battle = {
  "battle.label": { ja: "クエストの戦闘画面", ko: "퀘스트 전투 화면" },
  "battle.sceneAlt": { ja: "{foe}と、勇者{name}のチームが向かい合っている絵", ko: "{foe}와 용사 {name}의 팀이 마주 보고 있는 그림" },
  "battle.appear": { ja: "{foe}が あらわれた！", ko: "{foe} 출현!" },
  "battle.help": { ja: "勇者さま、助けてください！", ko: "용사님, 구해 주세요!" },
  "battle.identity": { ja: "{foe}の正体は、{about}です。", ko: "{foe}의 정체는 바로 {about}!" },
  "battle.ask": { ja: "勇者{name}、どうしますか？", ko: "용사 {name}, 어떻게 할까요?" },
  "battle.next": { ja: "つぎへ", ko: "다음" },
  "battle.says": { ja: "{name}：{text}", ko: "{name}: {text}" },
  "battle.commands": { ja: "コマンド", ko: "명령" },
  "battle.back": { ja: "もどる", ko: "돌아가기" },

  "battle.cmd.fight": { ja: "たたかう", ko: "싸운다" },
  "battle.cmd.fightSub": { ja: "クエストに挑戦", ko: "퀘스트 도전" },
  "battle.cmd.skill": { ja: "スキル", ko: "스킬" },
  "battle.cmd.skillSub": { ja: "相性を見る", ko: "상성 보기" },
  "battle.cmd.look": { ja: "しらべる", ko: "조사한다" },
  "battle.cmd.lookSub": { ja: "クエストの内容", ko: "퀘스트 내용" },
  "battle.cmd.run": { ja: "にげる", ko: "도망친다" },
  "battle.cmd.runSub": { ja: "一覧にもどる", ko: "목록으로" },

  "battle.fight.go": { ja: "勇者{name}の チームは クエストに いどんだ！", ko: "용사 {name}의 팀이 퀘스트에 도전했다!" },
  "battle.fight.goHint": { ja: "企画書の提出画面へ進みます。", ko: "기획서 제출 화면으로 가요." },
  "battle.fight.again": { ja: "クエスト達成ずみ！ 締切までは 企画書を 出しなおせる。", ko: "퀘스트 달성 완료! 마감 전까지 기획서를 다시 낼 수 있다." },
  "battle.fight.done": { ja: "このクエストは もう達成した！ 企業の 審査を 待とう。", ko: "이 퀘스트는 이미 달성했다! 기업의 심사를 기다리자." },
  "battle.fight.closed": { ja: "このクエストの 受付は 終わっている…", ko: "이 퀘스트의 접수는 끝났다…" },

  // しらべる(#41): 의뢰한 기업에게 선택지로 물어요 — 선택지는 용사가 하는 말, 대답은 기업이 쉬운 말로
  "battle.look.prompt": { ja: "何でも聞いてください！", ko: "무엇이든 물어보세요!" },
  "battle.look.details": { ja: "募集要項をぜんぶ読む", ko: "모집 요강 전체 읽기" },
  "battle.topics": { ja: "聞きたいこと", ko: "묻고 싶은 것" },
  "battle.topicHeard": { ja: "{label}（聞いた）", ko: "{label} (들었음)" },
  "battle.topic.trouble": { ja: "何に困っているんですか？", ko: "무엇이 곤란하세요?" },
  "battle.topic.todo": { ja: "何をすればいいですか？", ko: "무엇을 하면 되나요?" },
  "battle.topic.reward": { ja: "締切と報酬は？", ko: "마감과 보상은요?" },
  "battle.todo.deliverables": { ja: "出してほしいもの：", ko: "내 주셨으면 하는 것:" },
  "battle.todo.team": { ja: "1チーム{min}〜{max}人（大学生・大学院生）で挑戦できます。期間の目安は1〜2か月です。", ko: "한 팀 {min}~{max}명(대학생 · 대학원생)이 도전할 수 있어요. 권장 기간은 1~2개월이에요." },
  "battle.reward.deadline": { ja: "締切は{date}です（あと{days}日）。", ko: "마감은 {date}이에요(남은 날 {days}일)." },
  "battle.reward.today": { ja: "締切は今日、{date}です！", ko: "마감은 오늘, {date}이에요!" },
  "battle.reward.closed": { ja: "締切は{date}でした。受付は、もう終わっています。", ko: "마감은 {date}이었어요. 접수는 이미 끝났어요." },
  "battle.reward.items": { ja: "お礼として、{rewards} をご用意しています。", ko: "사례로 드릴 것: {rewards}" },
  "battle.reward.none": { ja: "賞金や賞品はありませんが、企画書には必ず評価コメントをお返しします。", ko: "상금이나 상품은 없지만, 기획서에는 꼭 평가 코멘트를 드려요." },

  "battle.skill.pick": { ja: "どの スキルを つかう？", ko: "어떤 스킬을 쓸까?" },
  "battle.skill.none": { ja: "まだ スキルが ない！ クエストで 受賞すると スキルを おぼえる。", ko: "아직 스킬이 없다! 퀘스트에서 수상하면 스킬을 배운다." },
  "battle.skill.use": { ja: "勇者{name}の SDG {sdg}スキル（Lv.{level}）！", ko: "용사 {name}의 SDG {sdg} 스킬(Lv.{level})!" },
  "battle.skill.good": { ja: "SDG {sdg}の 経験が いきる！ このクエストと 相性ばつぐんだ！", ko: "SDG {sdg}의 경험이 살아난다! 이 퀘스트와 상성이 아주 좋다!" },
  "battle.skill.new": { ja: "はじめての 分野だ。新しい スキルを おぼえる チャンス！", ko: "처음 도전하는 분야다. 새 스킬을 배울 기회!" },
  "battle.skill.match": { ja: "相性◎", ko: "상성◎" },

  "battle.run": { ja: "勇者{name}は うまく にげきれた！", ko: "용사 {name}, 무사히 도망쳤다!" },

  "battle.cleared": { ja: "{foe}を やっつけた！ クエスト達成！", ko: "{foe} 격파! 퀘스트 달성!" },
  "battle.clearedWait": { ja: "企画書をありがとうございます！ 審査の結果を、少しお待ちください。", ko: "기획서 고마워요! 심사 결과를 조금만 기다려 주세요." },
  "battle.clearedItem": { ja: "報酬アイテム「{item}」を 手に入れた！", ko: "보상 아이템 「{item}」 획득!" },

  "battle.hp": { ja: "HP", ko: "HP" },
  "battle.hpAria": { ja: "{foe}の のこりHP {percent}%", ko: "{foe}의 남은 HP {percent}%" },
  "battle.hpHint": { ja: "企画書を提出すると HPが0になり、クエスト達成です", ko: "기획서를 제출하면 HP가 0이 되고 퀘스트 달성이에요" },
  "battle.heroName": { ja: "勇者 {name}", ko: "용사 {name}" },
  "battle.heroSkills": { ja: "スキル {count}", ko: "스킬 {count}" },
  "battle.foeSdgs": { ja: "SDG {ids}", ko: "SDG {ids}" },

  // 퀘스트 목록의 의뢰서(#39): 양피지 두루마리 모양의 카드 — 의뢰인 · 과제(쉬운 말, #41) · 보상 · 남은 날 도장. 몬스터 이름은 그림 밑에 작게
  "scroll.title": { ja: "依頼書", ko: "의뢰서" },
  "scroll.client": { ja: "依頼主", ko: "의뢰인" },
  "scroll.problem": { ja: "課題", ko: "과제" },
  "scroll.reward": { ja: "報酬", ko: "보상" },
  "scroll.party": { ja: "募集", ko: "모집" },
  "scroll.daysLeft": { ja: "あと", ko: "남은 날" },
  "scroll.days": { ja: "{days}日", ko: "{days}일" },
  "scroll.today": { ja: "本日締切", ko: "오늘 마감" },
  "scroll.cleared": { ja: "達成", ko: "달성" },
  "scroll.foeAlt": { ja: "{foe}（この課題をあらわすモンスター）", ko: "{foe}(이 과제를 나타내는 몬스터)" },
} as const satisfies Record<string, LocalizedText>;
