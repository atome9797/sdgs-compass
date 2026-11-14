"use client";

// 「受け取った賞金」(데모): 받은 합계 · 받은 기록(기업 상금 · 운영사 특별상, 기업 상금은 지급한 기업을 평가) · 받을 수 있는 돈의 구조 · 고지 ①~③ (늘 보여요)
// 상금은 기업이 수상 팀에 직접 전액 지급하고, 운영사는 돈을 맡지 않아요(2026-11-08 직접 지급 모델) — 그래서 잔액·출금은 없어요. 설계는 docs/fees.md.
import { useMemo } from "react";
import { selectWallet, type WalletEntryVM } from "@sdgs-compass/core/walletView";
import { RatingBlock } from "@/components/Network";
import { Banner, Empty, ScreenHead, Section, Tag } from "@/components/ui";
import { buildHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";

/** 받은 기록 한 건 + (기업 상금이면) 지급한 기업 평가 — 약속대로 받았는지가 그 기업의 신뢰 실적이 돼요 */
function EntryItem({ entry }: { entry: WalletEntryVM }) {
  const { t } = useSession();
  return (
    <li className="stack stack--sm">
      <div className="card activity">
        <span className="activity__icon" aria-hidden="true">
          {entry.emoji}
        </span>
        <div className="activity__main">
          <p className="activity__title">{entry.title}</p>
          <p className="activity__meta">
            {entry.kindLabel} · {entry.dateLabel}
          </p>
        </div>
        <span className="wallet-amount wallet-amount--in">{entry.amountLabel}</span>
      </div>
      {entry.companyId && entry.ratingRef ? (
        <RatingBlock role="student" target={{ kind: "prize", refId: entry.ratingRef, toRole: "company", toId: entry.companyId }} title={t("rating.rateCompany")} fold />
      ) : null}
    </li>
  );
}

export function WalletScreen() {
  const { demo, locale, t } = useSession();
  const vm = useMemo(() => selectWallet(demo, locale), [demo, locale]);
  return (
    <div className="screen">
      <ScreenHead title={t("wallet.title")} back={buildHref(ROUTES.impact)} backLabel={t("wallet.back")} side={<Tag tone="warning">{t("wallet.demo")}</Tag>} />

      {/* 고지 ① — 상금은 기업이 직접 전액 지급하고 운영사는 돈을 맡지 않는다는 것을 맨 위에 늘 보여요 */}
      <Banner tone="info" icon="🤝">
        {vm.notices.direct}
      </Banner>

      <section className="card card--pad stack stack--sm wallet-balance" aria-label={t("wallet.title")}>
        <p className="small muted">{t("wallet.total")}</p>
        <p className="profile__total">{vm.totalLabel}</p>
        <p className="small muted">{vm.totalsLabel}</p>
      </section>

      <Section title={t("wallet.history")}>
        {vm.entries.length === 0 ? (
          <Empty>{t("wallet.historyEmpty")}</Empty>
        ) : (
          <ul className="card-list">
            {vm.entries.map((entry) => (
              <EntryItem key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("wallet.about.title")}>
        <ul className="card card--pad stack stack--sm wallet-about">
          <li>🏆 {t("wallet.about.prize")}</li>
          <li>🤝 {t("wallet.about.return")}</li>
          <li>🔒 {t("wallet.about.noHold")}</li>
        </ul>
      </Section>

      {/* 고지 ①~③ — 순서대로 늘 보여요 (① 은 맨 위에도) */}
      <Section title={t("wallet.noticesTitle")}>
        <ol className="wallet-notices">
          <li className="disclaimer">{vm.notices.direct}</li>
          <li className="disclaimer">{vm.notices.tax}</li>
          <li className="disclaimer">{vm.notices.skills}</li>
        </ol>
      </Section>
    </div>
  );
}
