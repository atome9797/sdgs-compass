"use client";

// B2B 관리자(SCR-06) 대시보드: 환영 · KPI 5개 · 챌린지 관리 · 상금 지급(기업이 수상 팀에 직접) · 수수료(상금·연구 의뢰비의 10%, 최저 ¥9,000 — 인턴 채용은 무료)
// #33 KPI 카드는 링크예요: 응모자·심사(모든 과제 + 상태 필터 — 주소에 남아요) 또는 이 화면 안의 칸(#b2b-challenges · #b2b-fees)으로 가요.
// 연구 의뢰: 과제 관리 아래에 한 줄 요약(모집 중 · 연구 중 · 확인 대기)과 「研究依頼を見る」 — 확인 대기가 있으면 노란 안내예요.
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { coverColors, tint } from "@sdgs-compass/core/theme";
import { ALL_CHALLENGES, selectB2bDashboard, type ChallengeCardVM, type FeeVM, type KpiVM } from "@sdgs-compass/core/selectors";
import { selectB2bResearch } from "@sdgs-compass/core/researchView";
import { selectPrizePayments, type PrizePaymentsVM } from "@sdgs-compass/core/walletView";
import { Banner, ButtonLink, Empty, Section, Tag } from "@/components/ui";
import { applicantsHref, b2bResearchHref, buildHref, DASHBOARD_ANCHORS, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";

/** 숫자 카드 하나: 카드 전체가 링크(키보드·스크린 리더는 「숫자 + 갈 곳」 이름으로), 오른쪽의 › 가 누를 수 있다는 표시예요 */
function KpiCard({ kpi }: { kpi: KpiVM }) {
  const body: ReactNode = (
    <>
      <span className="kpi__label">{kpi.label}</span>
      <span className="kpi__value">{kpi.value}</span>
      <span className="kpi__go" aria-hidden="true">
        ›
      </span>
    </>
  );
  const target = kpi.target;
  return (
    <li className={kpi.id === "fees" ? "card kpi kpi--fees" : "card kpi"}>
      {target.kind === "applicants" ? (
        <Link className="kpi__link" href={applicantsHref(ALL_CHALLENGES, target.filter)} aria-label={kpi.actionLabel} data-kpi={kpi.id}>
          {body}
        </Link>
      ) : (
        // 같은 화면 안의 칸이라 브라우저 기본 앵커 이동을 써요(라우터를 거치지 않아요)
        <a className="kpi__link" href={`#${DASHBOARD_ANCHORS[target.section]}`} aria-label={kpi.actionLabel} data-kpi={kpi.id}>
          {body}
        </a>
      )}
    </li>
  );
}

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

/** 수수료: 규칙(상금·연구 의뢰비의 10%, 최저 ¥9,000 — 상대에게는 직접 전액) · 무료인 것 · 합계 · 수수료가 생긴 거래 */
export function FeeSection({ fee, anchorId }: { fee: FeeVM; anchorId?: string }) {
  const { t } = useSession();
  return (
    <Section title={t("b2b.fees")} hint={t("fee.title")} id={anchorId}>
      <div className="card card--pad stack">
        <p className="strong">{fee.rule}</p>
        <Banner tone="info" icon="🎁">
          {fee.free}
        </Banner>
        <dl className="prize-kpis">
          <div className="fee-split__cell">
            <dt className="fee-split__label">{t("fee.count")}</dt>
            <dd className="fee-split__value">{fee.totals.count}</dd>
          </div>
          <div className="fee-split__cell">
            <dt className="fee-split__label">{t("fee.base")}</dt>
            <dd className="fee-split__value">{fee.totals.base}</dd>
          </div>
          <div className="fee-split__cell fee-split__cell--fee">
            <dt className="fee-split__label">{t("fee.fee")}</dt>
            <dd className="fee-split__value">{fee.totals.fee}</dd>
          </div>
        </dl>
        {fee.rows.length > 0 ? (
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th scope="col">{t("fee.kind")}</th>
                  <th scope="col">{t("fee.item")}</th>
                  <th scope="col">{t("fee.date")}</th>
                  <th scope="col" className="num">
                    {t("fee.base")}
                  </th>
                  <th scope="col" className="num">
                    {t("fee.fee")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {fee.rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label={t("fee.kind")}>
                      <Tag tone={row.kind === "prize" ? "success" : "info"}>{row.kindLabel}</Tag>
                    </td>
                    <td data-label={t("fee.item")}>{row.title}</td>
                    <td className="nowrap" data-label={t("fee.date")}>
                      {row.dateLabel}
                    </td>
                    <td className="num" data-label={t("fee.base")}>
                      {row.baseLabel}
                    </td>
                    <td className="num" data-label={t("fee.fee")}>
                      {row.feeLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{t("fee.empty")}</Empty>
        )}
        <p className="small muted">{fee.note}</p>
      </div>
    </Section>
  );
}

/** 상금 지급: 표창 전 · 지급한 상금 합계와 과제별 상태(상금은 기업이 수상 팀에 직접 — 수수료 10%는 따로) */
function PrizeSection({ prize }: { prize: PrizePaymentsVM }) {
  const { t } = useSession();
  return (
    <Section title={t("prize.section")} hint={prize.note}>
      <div className="card card--pad stack">
        <dl className="prize-kpis">
          <div className="fee-split__cell">
            <dt className="fee-split__label">{t("prize.kpiPromised")}</dt>
            <dd className="fee-split__value">{prize.promisedLabel}</dd>
          </div>
          <div className="fee-split__cell">
            <dt className="fee-split__label">{t("prize.kpiPaid")}</dt>
            <dd className="fee-split__value">{prize.paidLabel}</dd>
          </div>
        </dl>
        {prize.rows.length > 0 ? (
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th scope="col">{t("prize.col.challenge")}</th>
                  <th scope="col" className="num">
                    {t("prize.col.amount")}
                  </th>
                  <th scope="col" className="num">
                    {t("prize.col.fee")}
                  </th>
                  <th scope="col">{t("prize.col.status")}</th>
                  <th scope="col">{t("prize.col.date")}</th>
                </tr>
              </thead>
              <tbody>
                {prize.rows.map((row) => (
                  <tr key={row.challengeId}>
                    <td data-label={t("prize.col.challenge")}>{row.title}</td>
                    <td className="num" data-label={t("prize.col.amount")}>
                      {row.amountLabel}
                    </td>
                    <td className="num" data-label={t("prize.col.fee")}>
                      {row.feeLabel}
                    </td>
                    <td data-label={t("prize.col.status")}>
                      <Tag tone={row.status === "paid" ? "success" : row.status === "promised" ? "info" : undefined}>{row.statusLabel}</Tag>
                    </td>
                    <td className="nowrap" data-label={t("prize.col.date")}>
                      {row.dateLabel}
                    </td>
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
  const prize = useMemo(() => selectPrizePayments(demo, locale), [demo, locale]);
  const research = useMemo(() => selectB2bResearch(demo, locale), [demo, locale]);
  return (
    <>
      <div className="row row--between">
        <div className="welcome">
          <span className="welcome__logo" style={{ background: tint(vm.companyAccent, 0.18), borderColor: tint(vm.companyAccent, 0.5) }} aria-hidden="true">
            {vm.companyEmoji}
          </span>
          <h1 className="welcome__title">{vm.welcome}</h1>
        </div>
        <ButtonLink href={buildHref(ROUTES.b2bNew)}>＋ {t("b2b.newChallenge")}</ButtonLink>
      </div>

      <section aria-label={t("b2b.title")}>
        <ul className="kpi-grid">
          {vm.kpis.map((kpi) => (
            <KpiCard key={kpi.id} kpi={kpi} />
          ))}
        </ul>
      </section>

      <Section title={t("b2b.challenges")} id={DASHBOARD_ANCHORS.challenges}>
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

      <Section title={t("research.b2b.title")} hint={t("research.b2b.intro")}>
        <div className="card card--pad row row--between">
          <p className="strong">🔬 {research.summary}</p>
          <ButtonLink href={b2bResearchHref()} variant={research.needsAction > 0 ? "primary" : "secondary"} size="sm">
            {t("research.b2b.go")} ›
          </ButtonLink>
        </div>
      </Section>

      <PrizeSection prize={prize} />

      <FeeSection fee={vm.fee} anchorId={DASHBOARD_ANCHORS.fees} />
    </>
  );
}
