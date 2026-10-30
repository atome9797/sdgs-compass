// 맨 처음 화면 1: 언어 선택 (日本語 / 한국어). 기기 언어에 맞는 쪽을 미리 강조만 하고, 사람이 누르기 전에는 정해지지 않아요.
import { useMemo } from "react";
import { LanguageGate } from "@/components/LanguageGate";
import { Screen } from "@/components/Screen";
import { useApp } from "@/lib/AppProvider";
import { detectDeviceLocale } from "@/lib/language";

export function LanguageScreen() {
  const { chooseLanguage } = useApp();
  const detected = useMemo(() => detectDeviceLocale(), []);
  return (
    <Screen header="brand" testID="screen-language">
      <LanguageGate detected={detected} onSelect={chooseLanguage} />
    </Screen>
  );
}
