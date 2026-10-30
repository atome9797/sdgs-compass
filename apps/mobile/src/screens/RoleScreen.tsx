// 맨 처음 화면 2: 이용 유형 선택 (학생·개인 / 기업·단체). 언어는 머리글의 日本語 | 한국어 에서 여기서도 바꿀 수 있어요.
import { pick } from "@sdgs-compass/core/i18n";
import { RoleGate } from "@/components/RoleGate";
import { Screen } from "@/components/Screen";
import { useApp } from "@/lib/AppProvider";

export function RoleScreen() {
  const { demo, locale, dispatch } = useApp();
  const company = demo.companies.find((c) => c.id === demo.myCompanyId);
  return (
    <Screen testID="screen-role">
      <RoleGate
        locale={locale}
        studentName={demo.me.nickname}
        companyName={company ? pick(company.name, locale) : ""}
        onSelect={(role) => dispatch({ type: "setRole", role })}
      />
    </Screen>
  );
}
