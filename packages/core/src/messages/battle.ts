// 퀘스트 전투 화면(#38): 턴제 RPG 의 메시지 창 · 명령 메뉴 문구. 일본어는 옛 RPG 처럼 띄어 써요.
// 다른 게임의 대사를 그대로 쓰지 않아요(「〜が あらわれた！」 같은 RPG 의 흔한 말투만).
// 한국어는 받침에 따라 조사가 바뀌지 않게 「출현!」 「격파!」처럼 조사 없이 끝나는 말을 써요.
import type { LocalizedText } from "../i18n";

export const battle = {
  "battle.label": { ja: "クエストの戦闘画面", ko: "퀘스트 전투 화면" },
  "battle.sceneAlt": { ja: "{foe}と、勇者{name}のパーティが向かい合っている絵", ko: "{foe}와 용사 {name}의 파티가 마주 보고 있는 그림" },
  "battle.appear": { ja: "{foe}が あらわれた！", ko: "{foe} 출현!" },
  "battle.plea": { ja: "{company}「勇者さま、助けてください！」", ko: "{company}: 「용사님, 구해 주세요!」" },
  "battle.ask": { ja: "勇者{name}、どうしますか？", ko: "용사 {name}, 어떻게 할까요?" },
  "battle.next": { ja: "つぎへ", ko: "다음" },
  "battle.commands": { ja: "コマンド", ko: "명령" },

  "battle.cmd.fight": { ja: "たたかう", ko: "싸운다" },
  "battle.cmd.fightSub": { ja: "クエストに挑戦", ko: "퀘스트 도전" },
  "battle.cmd.skill": { ja: "スキル", ko: "스킬" },
  "battle.cmd.skillSub": { ja: "相性を見る", ko: "상성 보기" },
  "battle.cmd.look": { ja: "しらべる", ko: "조사한다" },
  "battle.cmd.lookSub": { ja: "クエストの内容", ko: "퀘스트 내용" },
  "battle.cmd.run": { ja: "にげる", ko: "도망친다" },
  "battle.cmd.runSub": { ja: "一覧にもどる", ko: "목록으로" },

  "battle.fight.go": { ja: "勇者{name}の パーティは クエストに いどんだ！", ko: "용사 {name}의 파티가 퀘스트에 도전했다!" },
  "battle.fight.goHint": { ja: "企画書の提出画面へ進みます。", ko: "기획서 제출 화면으로 가요." },
  "battle.fight.again": { ja: "クエスト達成ずみ！ 締切までは 企画書を 出しなおせる。", ko: "퀘스트 달성 완료! 마감 전까지 기획서를 다시 낼 수 있다." },
  "battle.fight.done": { ja: "このクエストは もう達成した！ 企業の 審査を 待とう。", ko: "이 퀘스트는 이미 달성했다! 기업의 심사를 기다리자." },
  "battle.fight.closed": { ja: "このクエストの 受付は 終わっている…", ko: "이 퀘스트의 접수는 끝났다…" },

  "battle.skill.pick": { ja: "どの スキルを つかう？", ko: "어떤 스킬을 쓸까?" },
  "battle.skill.none": { ja: "まだ スキルが ない！ クエストで 受賞すると スキルを おぼえる。", ko: "아직 스킬이 없다! 퀘스트에서 수상하면 스킬을 배운다." },
  "battle.skill.use": { ja: "勇者{name}の「{skill}」！", ko: "용사 {name}의 「{skill}」!" },
  "battle.skill.good": { ja: "SDG {sdg}の 経験が いきる！ このクエストと 相性ばつぐんだ！", ko: "SDG {sdg}의 경험이 살아난다! 이 퀘스트와 상성이 아주 좋다!" },
  "battle.skill.new": { ja: "はじめての 分野だ。新しい スキルを おぼえる チャンス！", ko: "처음 도전하는 분야다. 새 스킬을 배울 기회!" },
  "battle.skill.match": { ja: "相性◎", ko: "상성◎" },
  "battle.skill.back": { ja: "もどる", ko: "돌아가기" },

  "battle.look": { ja: "{company}からの 依頼：「{title}」", ko: "{company}의 의뢰: 「{title}」" },
  "battle.run": { ja: "勇者{name}は うまく にげきれた！", ko: "용사 {name}, 무사히 도망쳤다!" },

  "battle.cleared": { ja: "{foe}を やっつけた！ クエスト達成！", ko: "{foe} 격파! 퀘스트 달성!" },
  "battle.clearedWait": { ja: "企業の 審査を 待っています。", ko: "기업의 심사를 기다리고 있어요." },
  "battle.clearedItem": { ja: "報酬アイテム「{item}」を 手に入れた！", ko: "보상 아이템 「{item}」 획득!" },

  "battle.hp": { ja: "HP", ko: "HP" },
  "battle.hpAria": { ja: "{foe}の のこりHP {percent}%", ko: "{foe}의 남은 HP {percent}%" },
  "battle.hpHint": { ja: "企画書を提出すると HPが0になり、クエスト達成です", ko: "기획서를 제출하면 HP가 0이 되고 퀘스트 달성이에요" },
  "battle.heroName": { ja: "勇者 {name}", ko: "용사 {name}" },
  "battle.heroSkills": { ja: "スキル {count}", ko: "스킬 {count}" },
  "battle.foeSdgs": { ja: "SDG {ids}", ko: "SDG {ids}" },

  // 퀘스트 목록의 의뢰서(#39): 양피지 두루마리 모양의 카드 — 의뢰인 · 토벌 대상(과제 몬스터) · 보상 · 남은 날 도장
  "scroll.title": { ja: "依頼書", ko: "의뢰서" },
  "scroll.client": { ja: "依頼主", ko: "의뢰인" },
  "scroll.foe": { ja: "討伐対象", ko: "토벌 대상" },
  "scroll.reward": { ja: "報酬", ko: "보상" },
  "scroll.party": { ja: "募集", ko: "모집" },
  "scroll.daysLeft": { ja: "あと", ko: "남은 날" },
  "scroll.days": { ja: "{days}日", ko: "{days}일" },
  "scroll.today": { ja: "本日締切", ko: "오늘 마감" },
  "scroll.cleared": { ja: "達成", ko: "달성" },
  "scroll.foeAlt": { ja: "討伐対象：{foe}", ko: "토벌 대상: {foe}" },
} as const satisfies Record<string, LocalizedText>;
