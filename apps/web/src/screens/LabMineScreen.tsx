"use client";

// 연구자의 내 연구 /lab/mine/: 숫자(연구 중 · 확인 대기 · 완료 · 받은 의뢰비) · 상태별 목록 · 의뢰비는 기업에게서 직접 받는다는 안내
import { useMemo } from "react";
import { selectLabMine } from "@sdgs-compass/core/researchView";
import { ResearchCard, StatGrid } from "@/components/Research";
import { Banner, ButtonLink, Empty, ScreenHead, Section, Tag } from "@/components/ui";
import { buildHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";

export function LabMineScreen() {
  const { demo, locale, t } = useSession();
  const vm = useMemo(() => selectLabMine(demo, locale), [demo, locale]);
  return (
    <div className="screen">
      <ScreenHead title={t("lab.mine.title")} />
      <StatGrid items={vm.kpis} label={t("lab.mine.title")} />
      <Banner tone="info" icon="💴">
        {vm.note}
      </Banner>
      {vm.groups.map((group) => (
        <Section key={group.status} title={group.title} action={<Tag>{group.items.length}</Tag>}>
          {group.items.length === 0 ? (
            <Empty>{vm.emptyLabel}</Empty>
          ) : (
            <ul className="card-list">
              {group.items.map((card) => (
                <li key={card.id}>
                  <ResearchCard vm={card} showMine={false} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      ))}
      <div>
        <ButtonLink href={buildHref(ROUTES.lab)} variant="secondary">
          🔎 {t("lab.title")}
        </ButtonLink>
      </div>
    </div>
  );
}
