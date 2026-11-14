import { translate } from "@sdgs-compass/core/messages";
import { BrandLogo } from "@/components/BrandLogo";

/** 저장소를 불러오는 동안(그리고 서버가 미리 만든 첫 화면)에 보이는 화면. 아직 언어를 모르므로 두 언어를 함께 적어요. */
export function Splash() {
  return (
    <div className="splash" role="status">
      <BrandLogo className="splash__logo" />
      <span>
        <span lang="ja">{translate("common.loading", "ja")}</span> / <span lang="ko">{translate("common.loading", "ko")}</span>
      </span>
    </div>
  );
}
