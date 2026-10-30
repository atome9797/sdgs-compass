"use client";

// SCR-01 메인 홈: 인사 · 검색 · SDGs 17 타일 · AI 추천 · 마감 임박 · 참여 실적
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { selectHome, type ActivityVM } from "@sdgs-compass/core/selectors";
import { ChallengeCard, ChallengeRow } from "@/components/ChallengeCard";
import { SdgMiniRow, SdgTileGrid } from "@/components/sdg";
import { Button, Empty, Section } from "@/components/ui";
import { buildHref, ROUTES, searchHref } from "@/lib/routes";
import { useSession } from "@/lib/session";

const ACTIVITY_ICON: Record<ActivityVM["kind"], string> = { participation: "🙌", submission: "📝", award: "🏆", share: "📣" };

export function ActivityItem({ activity }: { activity: ActivityVM }) {
  return (
    <li className="card activity">
      <span className="activity__icon" aria-hidden="true">
        {ACTIVITY_ICON[activity.kind]}
      </span>
      <div className="activity__main">
        <p className="activity__title">{activity.title}</p>
        <p className="activity__meta">
          {activity.kindLabel}
          {activity.awardLabel ? ` · ${activity.awardLabel}` : ""} · {activity.companyName} · {activity.dateLabel}
        </p>
        {activity.sdgIds.length > 0 ? <SdgMiniRow ids={activity.sdgIds} /> : null}
      </div>
      <span className="activity__points">{activity.pointsLabel}</span>
    </li>
  );
}

export function HomeScreen() {
  const { demo, locale, t } = useSession();
  const router = useRouter();
  const vm = useMemo(() => selectHome(demo, locale), [demo, locale]);
  const [query, setQuery] = useState("");

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    router.push(searchHref({ q: query.trim() }));
  };

  return (
    <div className="screen">
      <section className="greeting">
        <h1 className="greeting__name">{t("home.greeting", { name: vm.nickname })}</h1>
        <p className="muted small">{t("app.tagline")}</p>
      </section>

      <form className="searchbox" role="search" onSubmit={onSearch}>
        <label className="sr-only" htmlFor="home-search">
          {t("common.search")}
        </label>
        <input id="home-search" className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("home.searchPlaceholder")} enterKeyHint="search" />
        <Button type="submit" aria-label={t("common.search")}>
          <span aria-hidden="true">🔎</span>
        </Button>
      </form>

      <Section title={t("home.sdgTitle")}>
        <SdgTileGrid tiles={vm.sdgTiles} />
      </Section>

      <Section title={t("home.recommendedTitle")} hint={t("home.recommendedHint")} action={<Link className="link-more" href={buildHref(ROUTES.search)}>{t("common.viewAll")}</Link>}>
        <div className="card-list">
          {vm.recommended.slice(0, 3).map((card) => (
            <ChallengeCard key={card.id} vm={card} showReasons />
          ))}
        </div>
      </Section>

      <Section title={t("home.deadlineSoon")}>
        <div className="card-list">
          {vm.soon.map((card) => (
            <ChallengeRow key={card.id} vm={card} />
          ))}
        </div>
      </Section>

      <Section title={t("home.myActivitiesTitle")} action={<Link className="link-more" href={buildHref(ROUTES.impact)}>{t("common.viewAll")}</Link>}>
        {vm.activities.length === 0 ? (
          <Empty>{t("home.myActivitiesEmpty")}</Empty>
        ) : (
          <ul className="card-list">
            {vm.activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
