// 퀘스트의 「과제 몬스터」(#38): 전투 화면과 퀘스트 목록의 의뢰서(#39)가 같이 써요. 셀렉터에서도 쓰려고 battle.ts 에서 떼어 냈어요.
import type { Challenge, FoeKind, QuestFoe } from "./domain";
import type { LocalizedText } from "./i18n";
import type { SdgId } from "./sdg";

/** 퀘스트에 몬스터(foe)가 없을 때(데모에서 기업이 새로 낸 퀘스트 등) 대표 SDG 로 고르는 모양 */
const FOE_BY_SDG: Record<SdgId, FoeKind> = {
  1: "ghost", 2: "ghost", 3: "ghost", 4: "wall", 5: "wall", 6: "jelly", 7: "smog", 8: "bird", 9: "bird",
  10: "wall", 11: "bird", 12: "bottle", 13: "smog", 14: "jelly", 15: "ghost", 16: "wall", 17: "wall",
};

/** 모양마다의 기본 이름 */
export const DEFAULT_FOE_NAMES: Record<FoeKind, LocalizedText> = {
  jelly: { ja: "プラごみクラゲ", ko: "플라스틱 해파리" },
  bottle: { ja: "つかいすてボトル", ko: "일회용 페트병" },
  smog: { ja: "くろけむり", ko: "검은 연기" },
  ghost: { ja: "もったいないの影", ko: "아까운 그림자" },
  wall: { ja: "みえない壁", ko: "보이지 않는 벽" },
  bird: { ja: "カンコドリ", ko: "썰렁새" },
};

export function foeOf(challenge: Pick<Challenge, "foe" | "sdgIds">): QuestFoe {
  if (challenge.foe) return challenge.foe;
  const kind = FOE_BY_SDG[challenge.sdgIds[0] ?? 17];
  return { kind, name: DEFAULT_FOE_NAMES[kind] };
}
