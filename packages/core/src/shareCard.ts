// F-501 1-Click 카드뉴스: 성과 한 건을 Instagram(1:1)·LinkedIn(1.91:1) 규격의 카드 내용으로 만들어요.
// F-502 개인정보 보호: 카드와 공유 문구에는 닉네임과 성과만 넣고, 학교·이메일 등은 넣지 않아요.
import type { Activity } from "./domain";
import { formatPoints } from "./format";
import type { ImpactIndex } from "./impact";
import { pick, type Locale } from "./i18n";
import { awardLabel } from "./labels";
import { translate } from "./messages";
import type { SdgId } from "./sdg";

export type CardTemplate = "instagram" | "linkedin";
export const CARD_TEMPLATES: readonly CardTemplate[] = ["instagram", "linkedin"];
/** 가로 ÷ 세로 */
export const CARD_ASPECT: Record<CardTemplate, number> = { instagram: 1, linkedin: 1.91 };

export interface ShareCard {
  template: CardTemplate;
  aspect: number;
  headline: string;
  /** 챌린지 이름 */
  title: string;
  /** 기업 이름과 수상 내용 */
  subtitle: string;
  stats: { label: string; value: string }[];
  sdgIds: SdgId[];
  hashtags: string;
  /** SNS 에 올릴 글 전체 */
  caption: string;
}

export interface ShareCardInput {
  nickname: string;
  activity: Activity;
  index: ImpactIndex;
  participationCount: number;
  awardCount: number;
  template: CardTemplate;
  locale: Locale;
}

export function buildShareCard(input: ShareCardInput): ShareCard {
  const { nickname, activity, index, template, locale } = input;
  const isAward = activity.kind === "award" && activity.award !== undefined;
  const title = pick(activity.title, locale);
  const company = pick(activity.companyName, locale);
  const awardText = activity.award ? awardLabel(activity.award, locale) : "";
  const sdgTags = activity.sdgIds.map((id) => `#SDGs${id}`).join(" ");
  const hashtags = [translate("share.hashtags", locale), sdgTags].filter(Boolean).join(" ");
  const caption = `${translate(isAward ? "share.captionAward" : "share.captionParticipation", locale, { challenge: title, award: awardText, sdgs: sdgTags })}\n${translate("share.hashtags", locale)}`;
  return {
    template,
    aspect: CARD_ASPECT[template],
    headline: translate(isAward ? "share.headlineAward" : "share.headlineParticipation", locale, { name: nickname }),
    title,
    subtitle: awardText ? `${company} · ${awardText}` : company,
    stats: [
      { label: translate("share.statPoints", locale), value: formatPoints(index.totalPoints) },
      { label: translate("share.statChallenges", locale), value: String(input.participationCount) },
      { label: translate("share.statAwards", locale), value: String(input.awardCount) },
    ],
    sdgIds: activity.sdgIds,
    hashtags,
    caption,
  };
}
