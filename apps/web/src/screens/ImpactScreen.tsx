"use client";

// SCR-04 마이 포트폴리오: 임팩트 레벨·진행률(포인트 숫자는 보이지 않아요) · 스카우트 수신 설정(따로 된 줄) · 17개 SDGs 레이더 차트 · 강점 SDGs · 배지 · 참여 실적
import Link from "next/link";
import { useMemo } from "react";
import { sdgLabel } from "@sdgs-compass/core/labels";
import { selectImpact } from "@sdgs-compass/core/selectors";
import { RadarChart } from "@/components/RadarChart";
import { ButtonLink, Empty, ScreenHead, Section } from "@/components/ui";
import { buildHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { ActivityItem } from "./HomeScreen";

export function ImpactScreen() {
  const { demo, locale, t } = useSession();
  const vm = useMemo(() => selectImpact(demo, locale), [demo, locale]);
  return (
    <div className="screen">
      <ScreenHead title={t("impact.title")} />

      <section className="card profile" aria-label={vm.nickname}>
        <div className="profile__top">
          <span className="avatar" aria-hidden="true">
            {vm.nickname.slice(0, 1)}
          </span>
          <div className="grow">
            <p className="strong">{vm.nickname}</p>
            <p className="small muted">
              {vm.university} · {vm.faculty}
            </p>
          </div>
        </div>
        {/* 실적은 포인트 숫자가 아니라 레벨 + 진행률로 보여요(돈과 무관한 지표) */}
        <div>
          <p className="small muted">{t("impact.total")}</p>
          <p className="profile__total">{vm.levelLabel}</p>
        </div>
        <div className="stack stack--sm">
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={vm.progressPercent} aria-label={vm.nextLevelLabel}>
            <div className="progress__bar" style={{ width: `${vm.progressPercent}%` }} />
          </div>
          <p className="small muted">{vm.nextLevelLabel}</p>
          <p className="small muted">{vm.levelHint}</p>
        </div>
        {/* 스카우트 수신은 포인트와 관계없는 "설정"이라, 진행 막대 아래가 아니라 선으로 나눈 따로 된 줄에 상태 + 설명 + 설정 링크로 보여요 */}
        <div className="profile__scout">
          <span className="profile__scout-icon" aria-hidden="true">
            {vm.scoutable ? "🔔" : "🔕"}
          </span>
          <div className="grow">
            <p className="small strong">{vm.scoutStatus}</p>
            <p className="small muted">{vm.scoutNote}</p>
          </div>
          <Link className="link-more profile__scout-link" href={buildHref(ROUTES.settings)}>
            {t("impact.scoutChange")}
          </Link>
        </div>
      </section>

      <Section title={t("impact.radarTitle")} hint={t("impact.radarHint")}>
        <div className="card radar">
          <RadarChart data={vm.perSdg} label={t("impact.radarTitle")} />
        </div>
      </Section>

      <Section title={t("impact.top")}>
        {vm.topSdgs.length === 0 ? (
          <Empty>{t("impact.badgesEmpty")}</Empty>
        ) : (
          <ol className="top-list">
            {vm.topSdgs.map((sdg, index) => (
              <li key={sdg.id} className="card top-item">
                <span className="top-item__rank">{index + 1}</span>
                <span className="top-item__name">{sdgLabel(sdg.id, locale)}</span>
                <span className="top-item__score">{sdg.score}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title={t("impact.badges")}>
        {vm.badges.length === 0 ? (
          <Empty>{t("impact.badgesEmpty")}</Empty>
        ) : (
          <ul className="badge-grid">
            {vm.badges.map((badge) => (
              <li key={badge.code} className="card badge">
                <span className="badge__emoji" aria-hidden="true">
                  {badge.emoji}
                </span>
                <span>
                  <span className="badge__name">{badge.name}</span>
                  <br />
                  <span className="badge__desc">{badge.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("impact.history")}>
        <ul className="card-list">
          {vm.activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </ul>
      </Section>

      <div className="stack">
        <ButtonLink href={buildHref(ROUTES.certificate)}>🏅 {t("impact.certificateButton")}</ButtonLink>
        <ButtonLink href={buildHref(ROUTES.impactSummary)} variant="secondary">
          🗂 {t("summary.entry")}
        </ButtonLink>
        <ButtonLink href={buildHref(ROUTES.share)} variant="secondary">
          📣 {t("impact.shareButton")}
        </ButtonLink>
      </div>
    </div>
  );
}
