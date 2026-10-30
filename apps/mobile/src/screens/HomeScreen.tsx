// SCR-01 홈: 인사 · 검색 칸 · SDGs 17목표 타일 · AI 추천 챌린지(매칭률+이유) · 마감 임박 · 내 참여 실적.
// 계산은 core 의 selectHome 이 하고, 이 화면은 그 결과를 그려요. 검색 칸·SDGs 타일을 누르면 검색 탭으로 조건을 채워서 넘어가요.
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { SdgId } from "@sdgs-compass/core/sdg";
import { selectHome } from "@sdgs-compass/core/selectors";
import { ActivityRow } from "@/components/ActivityRow";
import { ChallengeCard } from "@/components/ChallengeCard";
import { Screen, ScreenTitle } from "@/components/Screen";
import { SdgGrid } from "@/components/SdgTile";
import { SearchBox } from "@/components/SearchBox";
import { Button, Card, Empty, Section } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { challengeHref, ROUTES } from "@/lib/nav";
import { searchParamsOf } from "@/lib/searchParams";
import { SPACE } from "@/theme";

export function HomeScreen() {
  const { demo, locale, t } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const vm = useMemo(() => selectHome(demo, locale), [demo, locale]);

  /** 검색 탭을 (검색어·SDGs 를 채워서) 열어요. nonce 는 같은 조건으로 다시 열어도 새 요청으로 알아보게 해요 */
  const openSearch = (request: { query?: string; sdgIds?: readonly SdgId[] }) => {
    router.navigate({ pathname: ROUTES.search, params: searchParamsOf(request, String(Date.now())) });
  };

  return (
    <Screen tabbed testID="screen-home">
      <ScreenTitle title={t("home.greeting", { name: vm.nickname })} subtitle={t("app.tagline")} />
      <SearchBox
        testID="home-search"
        value={query}
        onChangeText={setQuery}
        placeholder={t("home.searchPlaceholder")}
        onSubmit={() => openSearch({ query })}
        submitLabel={t("common.search")}
      />

      <Section title={t("home.sdgTitle")}>
        <SdgGrid tiles={vm.sdgTiles} locale={locale} onPress={(id) => openSearch({ sdgIds: [id] })} />
      </Section>

      <Section title={t("home.recommendedTitle")} hint={t("home.recommendedHint")}>
        <View style={styles.list}>
          {vm.recommended.map((card) => (
            <ChallengeCard key={card.id} testID={`recommended-${card.id}`} card={card} showMatch onPress={() => router.push(challengeHref(card.id))} />
          ))}
        </View>
      </Section>

      <Section title={t("home.deadlineSoon")}>
        <View style={styles.list}>
          {vm.soon.map((card) => (
            <ChallengeCard key={card.id} testID={`soon-${card.id}`} card={card} onPress={() => router.push(challengeHref(card.id))} />
          ))}
        </View>
      </Section>

      <Section
        title={t("home.myActivitiesTitle")}
        right={<Button small variant="ghost" label={t("common.viewAll")} onPress={() => router.navigate(ROUTES.impact)} />}
      >
        {vm.activities.length === 0 ? (
          <Empty>{t("home.myActivitiesEmpty")}</Empty>
        ) : (
          <Card>
            {vm.activities.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} />
            ))}
          </Card>
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: SPACE.md },
});
