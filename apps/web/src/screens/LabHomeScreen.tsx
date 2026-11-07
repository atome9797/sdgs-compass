"use client";

// 연구자(대학원생) 홈 /lab/: 내 프로필 한 줄 · 아이디어를 형태로 만들기까지의 흐름(④ 강조) · 분야 칩(?field= — 주소에 남아요) · 지금 맡을 수 있는 연구 의뢰
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { parseResearchFieldFilter, selectLabHome } from "@sdgs-compass/core/researchView";
import { ResearchCard, ResearchFlow } from "@/components/Research";
import { Card, Empty, ScreenHead, Section, Tag } from "@/components/ui";
import { buildHref, labHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";

export function LabHomeScreen() {
  const { demo, locale, t } = useSession();
  const router = useRouter();
  const search = useSearchParams();
  const filter = parseResearchFieldFilter(search.get("field"));
  const vm = useMemo(() => selectLabHome(demo, locale, filter), [demo, locale, filter]);
  return (
    <div className="screen">
      <ScreenHead title={t("lab.title")} />
      <Card className="stack stack--sm">
        <p className="strong">🔬 {vm.profile.line}</p>
        <div className="chips">
          {vm.profile.fieldLabels.map((label) => (
            <Tag key={label} tone="info">
              {label}
            </Tag>
          ))}
        </div>
        <p className="small">{t("lab.intro")}</p>
        {vm.activeCount > 0 ? (
          <Link className="link-more" href={buildHref(ROUTES.labMine)}>
            🧪 {vm.activeLabel} ›
          </Link>
        ) : null}
      </Card>

      <ResearchFlow here={[4]} />

      <Section title={t("lab.openTitle")}>
        <div className="chips" role="group" aria-label={t("lab.filterLabel")}>
          {vm.filters.map((item) => (
            <button key={item.id} type="button" className="chip" aria-pressed={vm.filter === item.id} onClick={() => router.replace(labHref(item.id))}>
              {item.label} <span className="chip__count">{item.count}</span>
            </button>
          ))}
        </div>
        {vm.open.length === 0 ? (
          <Empty>{vm.emptyLabel}</Empty>
        ) : (
          <ul className="card-list">
            {vm.open.map((card) => (
              <li key={card.id}>
                <ResearchCard vm={card} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
