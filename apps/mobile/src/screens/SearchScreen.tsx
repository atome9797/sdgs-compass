// 검색 탭: 키워드 + SDGs 칩으로 챌린지를 거르고, 모집 중인 것을 매칭률 순으로 보여 줘요(core selectSearch).
// 홈에서 검색 칸·SDGs 타일을 누르면 경로 매개변수(q, sdg, n)로 조건을 채워서 열려요. n(nonce)이 바뀌면 새 요청이에요.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { SdgId } from "@sdgs-compass/core/sdg";
import { selectSdgTiles, selectSearch } from "@sdgs-compass/core/selectors";
import { ChallengeCard } from "@/components/ChallengeCard";
import { Screen, ScreenTitle } from "@/components/Screen";
import { SdgPicker } from "@/components/SdgTile";
import { SearchBox } from "@/components/SearchBox";
import { Button, Empty, Section, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { challengeHref } from "@/lib/nav";
import { parseSearchParams } from "@/lib/searchParams";
import { SPACE } from "@/theme";

export function SearchScreen() {
  const { demo, locale, t } = useApp();
  const router = useRouter();
  const request = parseSearchParams(useLocalSearchParams());
  const [query, setQuery] = useState(request.query);
  const [sdgIds, setSdgIds] = useState<SdgId[]>(request.sdgIds);
  const [seen, setSeen] = useState(request.nonce);
  // 홈에서 새 조건으로 넘어오면(nonce 가 바뀌면) 입력 칸을 그 조건으로 맞춰요
  if (seen !== request.nonce) {
    setSeen(request.nonce);
    setQuery(request.query);
    setSdgIds(request.sdgIds);
  }

  const tiles = useMemo(() => selectSdgTiles(locale), [locale]);
  const results = useMemo(() => selectSearch(demo, locale, { query, sdgIds }), [demo, locale, query, sdgIds]);
  const hasFilter = query.trim() !== "" || sdgIds.length > 0;
  const toggleSdg = (id: SdgId) => setSdgIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  return (
    <Screen tabbed testID="screen-search">
      <ScreenTitle title={t("search.title")} />
      <SearchBox testID="search-input" value={query} onChangeText={setQuery} placeholder={t("search.placeholder")} />

      <Section title={t("search.filterSdg")}>
        <SdgPicker tiles={tiles} locale={locale} selected={sdgIds} onToggle={toggleSdg} />
      </Section>

      {hasFilter ? (
        <View style={styles.clear}>
          <Button
            small
            variant="secondary"
            icon="✕"
            label={t("search.clear")}
            onPress={() => {
              setQuery("");
              setSdgIds([]);
            }}
          />
        </View>
      ) : null}

      <View style={styles.summary}>
        <Txt variant="heading" accessibilityLiveRegion="polite">
          {t("search.results", { count: results.length })}
        </Txt>
        <Txt variant="small" tone="muted">
          {t("search.sortNote")}
        </Txt>
      </View>

      {results.length === 0 ? (
        <Empty testID="search-empty">{t("search.empty")}</Empty>
      ) : (
        <View style={styles.list}>
          {results.map((card) => (
            <ChallengeCard key={card.id} testID={`result-${card.id}`} card={card} onPress={() => router.push(challengeHref(card.id))} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: SPACE.md },
  summary: { gap: SPACE.xs },
  clear: { alignItems: "flex-start" },
});
