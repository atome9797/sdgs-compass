// 첫 화면(SCR-01)의 「協力団体」 배너 — Swiper 처럼 저절로 넘어가는 광고 배너에 싣는 단체.
// 지금은 모두 가상의 샘플이에요(이름·활동은 지어낸 것, 사진·로고는 쓰지 않고 이모지로 대신해요).
// 실제 단체로 바꿀 때는, 그 단체에서 이름·로고·사진을 앱(공개 웹사이트)에 싣는 허락을 먼저 받아요.
import type { LocalizedText } from "./i18n";
import type { SdgId } from "./sdg";

export interface PartnerBanner {
  id: string;
  /** 단체 이름 */
  name: LocalizedText;
  /** 어떤 단체인지 한 줄 */
  kind: LocalizedText;
  /** 큰 글씨 한 줄(광고 문구) */
  headline: LocalizedText;
  /** 설명 한 문장 */
  body: LocalizedText;
  /** 그림 대신 쓰는 이모지 */
  emoji: string;
  /** 배너 바탕색 — 위에 흰 글자를 쓰므로 흰색과 대비 4.5:1 이상 */
  accent: string;
  /** 활동과 관련된 SDGs 목표. 배너에 작게 보이고, 「関連するクエストを見る」는 이 목표로 검색해요 */
  sdgIds: readonly SdgId[];
  /** 가상의 샘플 단체인지 (배너에 「サンプル」 표시) */
  sample: boolean;
}

export const PARTNER_BANNERS: readonly PartnerBanner[] = [
  {
    id: "pt-shore",
    name: { ja: "なみま釣具", ko: "나미마 낚시용품" },
    kind: { ja: "海岸清掃を続ける釣具の会社", ko: "해안 청소를 이어 온 낚시용품 회사" },
    headline: { ja: "浜のごみ拾いから、包装を変える", ko: "해변 쓰레기 줍기에서 포장 바꾸기까지" },
    body: { ja: "製品のプラスチック包装を減らすアイデアを、学生の勇者と探しています。", ko: "제품의 플라스틱 포장을 줄일 아이디어를 학생 용사와 함께 찾고 있어요." },
    emoji: "🎣",
    accent: "#1F5E7A",
    sdgIds: [14, 12],
    sample: true,
  },
  {
    id: "pt-seabed",
    name: { ja: "うみそこクリーン隊", ko: "우미소코 클린대" },
    kind: { ja: "海の底のごみを回収するダイバーのチーム", ko: "바다 밑 쓰레기를 수거하는 다이버 팀" },
    headline: { ja: "海の底のごみを、潜って回収", ko: "바다 밑 쓰레기를 잠수해서 수거" },
    body: { ja: "海の底に残った釣り糸やルアーを集めて、再生して生かしています。", ko: "바다 밑에 남은 낚싯줄과 루어를 모아 다시 살려 쓰고 있어요." },
    emoji: "🤿",
    accent: "#1B4965",
    sdgIds: [14],
    sample: true,
  },
];
