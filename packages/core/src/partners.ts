// 첫 화면(SCR-01)의 「協力団体」 배너 — Swiper 처럼 저절로 넘어가는 광고 배너에 싣는 단체.
// · 실제 단체(sample: false)는 그 단체에서 앱(공개 웹사이트 · 공개 저장소) 게재 허락을 받은 곳만, 허락받은 내용만 실어요.
// · 가상의 샘플(sample: true)을 넣을 때는 「サンプル」 표시가 붙고, 웹사이트 · 로고는 넣지 않아요(지금은 샘플이 없어요).
// · 사진은 쓰지 않아요. 로고는 허락받은 단체만, 없으면 이모지로 대신해요.
import type { LocalizedText } from "./i18n";
import type { SdgId } from "./sdg";

export interface PartnerBanner {
  id: string;
  /** 단체 이름 (실제 단체는 공식 이름을 두 언어 모두 그대로) */
  name: LocalizedText;
  /** 어떤 단체인지 한 줄 */
  kind: LocalizedText;
  /** 큰 글씨 한 줄(광고 문구) */
  headline: LocalizedText;
  /** 설명 한 문장 */
  body: LocalizedText;
  /** 로고가 없을 때 그림 대신 쓰는 이모지 */
  emoji: string;
  /**
   * 로고 파일 이름 (허락받은 실제 단체만). 웹은 apps/web/public/partners/, 모바일은 apps/mobile/assets/images/partners/ 에
   * 같은 이름으로 두고, 모바일은 lib/partnerLogos.ts 에도 적어요. 이름 옆에 붙는 장식이라 화면 읽기 프로그램은 건너뛰어요.
   */
  logo?: string;
  /** 배너 바탕색 — 위에 흰 글자를 쓰므로 흰색과 대비 4.5:1 이상 */
  accent: string;
  /** 활동과 관련된 SDGs 목표. 배너에 작게 보이고, 웹사이트가 없으면 「関連するクエストを見る」가 이 목표로 검색해요 */
  sdgIds: readonly SdgId[];
  /** 단체의 웹사이트 (허락받은 실제 단체만). 있으면 배너 단추가 「ウェブサイトを見る」(새 탭) */
  url?: string;
  /** 가상의 샘플 단체인지 (배너에 「サンプル」 표시) */
  sample: boolean;
}

export const PARTNER_BANNERS: readonly PartnerBanner[] = [
  {
    // 2026-11-20 게재 허락: 회사명 · 표제 · 소개 글 · 웹사이트 링크. 소개 글과 브랜드명은 회사가 고쳐 준 그대로예요.
    // 사진 · 로고는 쓰지 않아요. 2026-12-05 까지 싣고, 그 뒤로도 실을지는 다시 여쭤봐요.
    id: "pt-atec",
    name: { ja: "株式会社エイテック", ko: "株式会社エイテック" },
    kind: { ja: "釣具ブランド「テイルウォーク」「アルファタックル」・静岡県沼津市", ko: "낚시용품 브랜드 「테일워크」「알파태클」 · 시즈오카현 누마즈시" },
    headline: { ja: "浜のごみ拾いから、包装を変える", ko: "해변 쓰레기 줍기에서 포장 바꾸기까지" },
    body: {
      ja: "釣具メーカー　沼津の浜で海岸清掃を続け、製品の包装を環境に良い素材に変えることを模索しています。",
      ko: "낚시용품 제조사. 누마즈 해변에서 해안 청소를 이어 가며, 제품 포장을 환경에 좋은 소재로 바꾸는 방법을 모색하고 있어요.",
    },
    emoji: "🎣",
    accent: "#1F5E7A",
    sdgIds: [14, 12],
    url: "https://atec.fishing/sustainability/",
    sample: false,
  },
  {
    // 2026-11-20 게재 허락: 이름 · 로고 · 표제 · 소개 글 · 웹사이트 링크(요청 문서에 적은 글 그대로, 고칠 곳 없음).
    // 사진은 쓰지 않아요. 로고는 받은 그림을 줄이기만 했어요. 2026-12-05 까지 싣고, 그 뒤로도 실을지는 다시 여쭤봐요.
    id: "pt-marine-sweeper",
    name: { ja: "Marine Sweeper", ko: "Marine Sweeper" },
    kind: { ja: "マリンスイーパー・水中清掃チーム", ko: "마린 스위퍼 · 수중 청소 팀" },
    headline: { ja: "海の底のごみを、潜って回収", ko: "바다 밑 쓰레기를 잠수해서 수거" },
    body: { ja: "海の底に残る釣り糸やルアーを回収し、再生して販売しています。", ko: "바다 밑에 남은 낚싯줄과 루어를 수거해, 재생해서 판매하고 있어요." },
    emoji: "🤿",
    logo: "marine-sweeper.png",
    accent: "#1B4965",
    sdgIds: [14],
    url: "https://marinesweeper.jp/",
    sample: false,
  },
];
