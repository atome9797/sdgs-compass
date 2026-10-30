// id → 지금 언어의 이름. 화면이 키를 직접 조립하지 않도록 한 곳에 모았어요.
import type { AwardKind, ChallengeStatus, Participation, ProposalStatus, RewardKind, ScoutKind, SkillId } from "./domain";
import type { Locale } from "./i18n";
import { translate } from "./messages";
import { getSdg, type SdgId } from "./sdg";

export const sdgName = (id: SdgId, locale: Locale): string => getSdg(id).name[locale];
export const sdgShort = (id: SdgId, locale: Locale): string => getSdg(id).short[locale];
/** "目標14 海の豊かさを守ろう" 형식의 라벨 */
export const sdgLabel = (id: SdgId, locale: Locale): string => (locale === "ja" ? `目標${id} ${sdgName(id, locale)}` : `목표 ${id} ${sdgName(id, locale)}`);

export const skillLabel = (id: SkillId, locale: Locale): string => translate(`skill.${id}`, locale);
export const awardLabel = (kind: AwardKind, locale: Locale): string => translate(`award.${kind}`, locale);
export const rewardLabel = (kind: RewardKind, locale: Locale): string => translate(`reward.${kind}`, locale);
export const participationLabel = (kind: Participation, locale: Locale): string => translate(`participation.${kind}`, locale);
export const challengeStatusLabel = (status: ChallengeStatus, locale: Locale): string => translate(`status.${status}`, locale);
export const proposalStatusLabel = (status: ProposalStatus, locale: Locale): string => translate(`proposalStatus.${status}`, locale);

export function scoutKindLabel(kind: ScoutKind, locale: Locale): string {
  if (kind === "internship") return translate("inbox.kindInternship", locale);
  if (kind === "offer") return translate("inbox.kindOffer", locale);
  return translate("inbox.kindInterview", locale);
}
