// 시연용 "샘플 입력" 문구: 무대에서 긴 글을 직접 치지 않아도 되도록, 버튼 하나로 입력 칸을 채워요.
// 사람이 직접 적은 글이 아니라 데모용 예시라서 버튼에도 "(デモ)"를 붙여 밝혀요. 언어마다 한 가지 언어로만 적어요.
import type { SkillId } from "@sdgs-compass/core/domain";
import type { LocalizedText } from "@sdgs-compass/core/i18n";
import type { SdgId } from "@sdgs-compass/core/sdg";

export const SAMPLE_PROPOSAL: { title: LocalizedText; summary: LocalizedText } = {
  title: {
    ja: "海洋プラスチックを減らす、地域循環型の包装プラン",
    ko: "해양 플라스틱을 줄이는 지역 순환형 포장 플랜",
  },
  summary: {
    ja: "漁港で出る使い捨て包装を、回収して再利用できる容器に置き換える提案です。地域の飲食店と連携し、回収ボックスとスタンプカードで参加を促します。",
    ko: "어항에서 나오는 일회용 포장을 회수해 재사용할 수 있는 용기로 바꾸는 제안이에요. 지역 음식점과 연계해 회수함과 스탬프 카드로 참여를 유도합니다.",
  },
};

export const SAMPLE_TEAM_POST: { title: LocalizedText; body: LocalizedText; roles: SkillId[] } = {
  title: { ja: "動画編集ができる仲間を募集します", ko: "영상 편집이 가능한 팀원을 모집해요" },
  body: {
    ja: "SNSで発信する紹介動画をつくりたいです。週1回オンラインで集まれる方を歓迎します。",
    ko: "SNS에 올릴 소개 영상을 만들고 싶어요. 주 1회 온라인으로 모일 수 있는 분을 환영해요.",
  },
  roles: ["video"],
};

export const SAMPLE_CHALLENGE: { title: LocalizedText; summary: LocalizedText; sdgIds: SdgId[] } = {
  title: { ja: "港の朝市をSNSで広げる企画", ko: "항구 아침시장을 SNS로 알리는 기획" },
  summary: {
    ja: "地元の朝市を若い世代にも知ってもらうため、SNSで発信する企画を募集します。",
    ko: "지역 아침시장을 젊은 세대에게도 알리기 위해 SNS로 홍보하는 기획을 모집해요.",
  },
  sdgIds: [14, 12],
};
