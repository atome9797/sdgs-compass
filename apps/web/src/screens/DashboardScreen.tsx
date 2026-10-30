"use client";

// B2B 관리자(SCR-06) 대시보드: 환영 · KPI 5개 · 챌린지 관리 · 중개 수수료와 기부 내역(¥30,000 → 50% 기부)
import Link from "next/link";
import { useMemo } from "react";
import { coverColors } from "@sdgs-compass/core/theme";
import { selectB2bDashboard, type ChallengeCardVM, type FeeVM } from "@sdgs-compass/core/selectors";
import { Banner, ButtonLink, Empty, Section, Tag } from "@/components/ui";
import { applicantsHref, buildHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";

function ManagedChallenge({ vm }: { vm: ChallengeCardVM }) {
  const { t } = useSession();
  const { from, to } = coverColors(vm.hue);
  const tone = vm.status === "open" ? "success" : vm.status === "judging" ? "warning" : undefined;
  return (
    <li className="card mgmt-row">
      <span className="mgmt-row__cover" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} aria-hidden="true">
        {vm.companyEmoji}
      </span>
      <div className="mgmt-row__main">
        <Link className="mgmt-row__title" href={applicantsHref(vm.id)} style={{ color: "inherit" }}>
          {vm.title}
        </Link>
        <div className="mgmt-row__meta">
          <Tag tone={tone}>{vm.statusLabel}</Tag>
          <Tag tone={vm.isOpen ? "danger" : undefined}>{vm.dDay}</Tag>
          <span>{vm.applicantsLabel}</span>
          <span>
            {t("challenge.closesOn")} {vm.closesOnLabel}
          </span>
        </div>
      </div>
      <ButtonLink href={applicantsHref(vm.id)} variant="secondary" size="sm">
        {t("b2b.viewApplicants")}
      </ButtonLink>
    </li>
  );
}

export function FeeSection({ fee }: { fee: FeeVM }) {
  const { t } = useSession();
  return (
    <Section title={t("b2b.fees")} hint={t("fee.title")}>
      <div className="card card--pad stack">
        <div className="stack stack--sm">
          <p className="field__label">{t("fee.perMatch")}</p>
          <div className="fee-split">
            <div className="fee-split__cell">
              <span className="fee-split__label">{t("fee.gross")}</span>
              <span className="fee-split__value">{fee.perMatch.gross}</span>
            </div>
            <div className="fee-split__cell fee-split__cell--donation">
              <span className="fee-split__label">💗 {t("fee.donation")}</span>
              <span className="fee-split__value">{fee.perMatch.donation}</span>
            </div>
            <div className="fee-split__cell">
              <span className="fee-split__label">{t("fee.revenue")}</span>
              <span className="fee-split__value">{fee.perMatch.revenue}</span>
            </div>
          </div>
        </div>
        <Banner tone="info" icon="💗">
          {fee.note}
        </Banner>
        <dl className="kv">
          <dt>{t("fee.matches")}</dt>
          <dd>{fee.totals.count}</dd>
          <dt>{t("fee.gross")}</dt>
          <dd>{fee.totals.gross}</dd>
          <dt>{t("fee.donation")}</dt>
          <dd>{fee.totals.donation}</dd>
          <dt>{t("fee.revenue")}</dt>
          <dd>{fee.totals.revenue}</dd>
        </dl>
        {fee.rows.length > 0 ? (
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th scope="col">{t("cert.challenge")}</th>
                  <th scope="col">{t("cert.issuedOn")}</th>
                  <th scope="col" className="num">
                    {t("fee.gross")}
                  </th>
                  <th scope="col" className="num">
                    {t("fee.donation")}
                  </th>
                  <th scope="col">{t("fee.recipient")}</th>
                </tr>
              </thead>
              <tbody>
                {fee.rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label={t("cert.challenge")}>{row.title}</td>
                    <td className="nowrap" data-label={t("cert.issuedOn")}>
                      {row.dateLabel}
                    </td>
                    <td className="num" data-label={t("fee.gross")}>
                      {row.feeLabel}
                    </td>
                    <td className="num" data-label={t("fee.donation")}>
                      {row.donationLabel}
                    </td>
                    <td data-label={t("fee.recipient")}>{row.recipient}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </Section>
  );
}

export function DashboardScreen() {
  const { demo, locale, t } = useSession();
  const vm = useMemo(() => selectB2bDashboard(demo, locale), [demo, locale]);
  return (
    <>
      <div className="row row--between">
        <div className="welcome">
          <span className="welcome__logo" style={{ background: vm.companyAccent }} aria-hidden="true">
            {vm.companyEmoji}
          </span>
          <h1 className="welcome__title">{vm.welcome}</h1>
        </div>
        <ButtonLink href={buildHref(ROUTES.b2bNew)}>＋ {t("b2b.newChallenge")}</ButtonLink>
      </div>

      <section aria-label={t("b2b.title")}>
        <ul className="kpi-grid">
          {vm.kpis.map((kpi) => (
            <li key={kpi.id} className={kpi.id === "donation" ? "card kpi kpi--donation" : "card kpi"}>
              <span className="kpi__label">{kpi.label}</span>
              <span className="kpi__value">{kpi.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <Section title={t("b2b.challenges")}>
        {vm.challenges.length === 0 ? (
          <Empty>{t("b2b.noChallenges")}</Empty>
        ) : (
          <ul className="card-list">
            {vm.challenges.map((challenge) => (
              <ManagedChallenge key={challenge.id} vm={challenge} />
            ))}
          </ul>
        )}
      </Section>

      <FeeSection fee={vm.fee} />
    </>
  );
}
