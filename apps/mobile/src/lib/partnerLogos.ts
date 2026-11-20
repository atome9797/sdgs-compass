// 협력 단체 배너의 로고: core 의 PARTNER_BANNERS[].logo(파일 이름) → 앱에 묶어 넣은 그림.
// 로고는 그 단체에서 앱 게재 허락을 받은 경우만 넣어요. 새 로고는 assets/images/partners/ 에 두고 여기에 한 줄 더해요
// (Metro 는 require 의 경로가 글자 그대로여야 묶어 넣을 수 있어요).
import type { ImageSourcePropType } from "react-native";

export const PARTNER_LOGOS: Readonly<Record<string, ImageSourcePropType>> = {
  "marine-sweeper.png": require("../../assets/images/partners/marine-sweeper.png"),
};
