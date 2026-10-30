"use client";

// 운영자 화면 ① 이용 현황 (/admin/): 데모 데이터의 지금 값(숫자 타일 · SDGs 순위 · 기획서 상태 · 챌린지 표)과, 고른 기간(7/30/90일) 안의 움직임(스파크라인).
// 집계는 core/adminUsage.ts 가 해요. 여기서는 읽기만 하고(데모 데이터를 바꾸지 않아요) 보기 좋게 그려요. 숫자는 모두 가상의 샘플이에요.
import { useMemo, useState } from "react";
import { formatDate, formatNumber, formatYen } from "@sdgs-compass/core/format";
import { pick } from "@sdgs-compass/core/i18n";
import { challengeStatusLabel, proposalStatusLabel, sdgLabel, sdgShort } from "@sdgs-compass/core/labels";
import { OFFICIAL_CHANNELS, officialChannelName } from "@sdgs-compass/core/post";
import {
  bucketLabel,
  DEFAULT_USAGE_RANGE,
  summarizeUsage,
  timelineSeries,
  USAGE_EVENT_KINDS,
  USAGE_EVENT_LABEL,
  USAGE_RANGE_LABEL,
  USAGE_RANGES,
  USAGE_UNIT_LABEL,
  usageCurrentInsights,
  usagePeriodInsight,
  type UsageRange,
} from "@sdgs-compass/core/adminUsage";
import { CHANNEL_COLOR } from "@/components/charts/channelColors";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { HBarChart } from "@/components/charts/HBarChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { Section, Tag } from "@/components/ui";
import { useAdmin } from "@/lib/adminSession";

/** 순서가 있는 항목(기획서 상태: 제출 → 심사 → 수상 → 채택)의 단계색 */
const STATUS_COLOR = ["var(--adm-o1)", "var(--adm-o2)", "var(--adm-o3)", "var(--adm-o4)"] as const;
/** 순위표에 그리는 SDGs 는 응모자가 있는 것 중 위쪽 8개까지 (전체 17개는 "표로 보기"에 있어요) */
const SDG_BARS = 8;

export function AdminUsageScreen() {
  const { t, locale, demo } = useAdmin();
  const [range, setRange] = useState<UsageRange>(DEFAULT_USAGE_RANGE);
  const summary = useMemo(() => summarizeUsage(demo, range), [demo, range]);
  const { totals, timeline } = summary;

  const tiles = [
    { id: "students", label: t("admin.usage.kpi.students"), value: totals.students, sub: t("admin.usage.sub.students", { n: totals.scoutableStudents }) },
    { id: "companies", label: t("admin.usage.kpi.companies"), value: totals.companies, sub: t("admin.usage.sub.companies", { n: totals.verifiedCompanies }) },
    {
      id: "challenges",
      label: t("admin.usage.kpi.challenges"),
      value: totals.challenges,
      sub: t("admin.usage.sub.challenges", { open: totals.challengesByStatus.open, judging: totals.challengesByStatus.judging, closed: totals.challengesByStatus.closed }),
    },
    { id: "applicants", label: t("admin.usage.kpi.applicants"), value: totals.applicants, sub: null },
    {
      id: "proposals",
      label: t("admin.usage.kpi.proposals"),
      value: totals.proposals,
      sub: t("admin.usage.sub.proposals", { reviewed: totals.proposalsByStatus.reviewed, adopted: totals.proposalsByStatus.adopted }),
    },
    { id: "awards", label: t("admin.usage.kpi.awards"), value: totals.awards, sub: null },
    { id: "certificates", label: t("admin.usage.kpi.certificates"), value: totals.certificates, sub: t("admin.usage.sub.certificates") },
    {
      id: "scouts",
      label: t("admin.usage.kpi.scouts"),
      value: totals.scouts,
      sub: t("admin.usage.sub.scouts", { accepted: totals.scoutsByStatus.accepted, read: totals.scoutsByStatus.read, declined: totals.scoutsByStatus.declined }),
    },
    {
      id: "matches",
      label: t("admin.usage.kpi.matches"),
      value: totals.matches,
      sub: t("admin.usage.sub.matches", { fee: formatYen(totals.feeYen, locale), donation: formatYen(totals.donationYen, locale) }),
    },
    { id: "posts", label: t("admin.usage.kpi.posts"), value: totals.posts, sub: t("admin.usage.sub.posts", { brag: totals.bragPosts, pr: totals.prPosts }) },
    { id: "likes", label: t("admin.usage.kpi.likes"), value: totals.likes, sub: null },
    { id: "official", label: t("admin.usage.kpi.official"), value: totals.officialShares, sub: t("admin.usage.sub.official") },
  ];

  const currentInsights = usageCurrentInsights(summary, locale);
  const periodInsight = usagePeriodInsight(summary, locale);

  // SDGs 순위: 응모자가 있는 목표만, 위쪽 8개. 표(표로 보기)에는 17개 전부.
  const sdgRows = summary.sdgs.filter((row) => row.applicants > 0).slice(0, SDG_BARS);
  const topSdg = sdgRows[0];

  // 기획서 상태
  const statusTotal = summary.proposalStatus.reduce((sum, row) => sum + row.count, 0);
  const counts = Object.fromEntries(summary.proposalStatus.map((row) => [row.status, row.count])) as Record<string, number>;

  // 공식 SNS 게시 신청: SNS 마다 한 줄 (신청이 없는 SNS 도 0 으로 보여서, 어느 SNS 를 안 쓰는지도 보여요)
  const officialRows = OFFICIAL_CHANNELS.map((channel) => ({ id: channel, label: officialChannelName(channel, locale), value: totals.officialByChannel[channel], color: CHANNEL_COLOR[channel] }));

  // 기간 표: 구간마다 한 줄
  const bucketName = (index: number): string => {
    const bucket = timeline.buckets[index];
    return timeline.unitDays === 1 ? bucketLabel(bucket) : t("admin.usage.bucket", { date: bucketLabel(bucket) });
  };

  return (
    <>
      <section className="adm-intro" aria-labelledby="adm-usage-title">
        <div className="adm-intro__title">
          <h1 id="adm-usage-title" className="adm-h1">
            {t("admin.usage.title")}
          </h1>
          <Tag tone="warning">{t("admin.sampleBadge")}</Tag>
        </div>
        <p className="adm-lead">{t("admin.usage.lead")}</p>
        <p className="adm-meta">{t("admin.usage.asOf", { date: formatDate(summary.asOf, locale) })}</p>
      </section>

      <Section title={t("admin.usage.kpi.title")}>
        <div className="adm-kpis">
          {tiles.map((tile) => (
            <div key={tile.id} className="card adm-kpi">
              <span className="adm-kpi__label">{tile.label}</span>
              <span className="adm-kpi__value">{formatNumber(tile.value)}</span>
              {tile.sub ? <span className="adm-kpi__sub">{tile.sub}</span> : null}
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("admin.usage.insight.title")}>
        <div className="card card--pad">
          <ul className="adm-insights">
            {currentInsights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </Section>

      <div className="adm-charts adm-charts--2">
        <HBarChart
          title={t("admin.usage.sdg.title")}
          hint={t("admin.usage.sdg.hint")}
          summary={topSdg ? t("admin.usage.sdg.summary", { name: sdgShort(topSdg.sdgId, locale), n: topSdg.applicants }) : t("admin.usage.sdg.empty")}
          rows={sdgRows.map((row) => ({ id: String(row.sdgId), label: `${row.sdgId} ${sdgShort(row.sdgId, locale)}`, value: row.applicants }))}
          formatValue={formatNumber}
          nameHeader="SDGs"
          valueHeader={t("admin.usage.sdg.applicants")}
          emptyText={t("admin.usage.sdg.empty")}
          table={{
            head: ["SDGs", t("admin.usage.sdg.applicants"), t("admin.usage.sdg.challenges"), t("admin.usage.sdg.interests")],
            rows: summary.sdgs.map((row) => [sdgLabel(row.sdgId, locale), formatNumber(row.applicants), formatNumber(row.challenges), formatNumber(row.interests)]),
          }}
        />
        {/* 오른쪽 칸에는 작은 그래프 둘을 쌓아요 (왼쪽 SDGs 순위표와 높이가 비슷해요) */}
        <div className="adm-stack">
          <HBarChart
            title={t("admin.usage.status.title")}
            summary={t("admin.usage.status.summary", { submitted: counts.submitted ?? 0, reviewed: counts.reviewed ?? 0, awarded: counts.awarded ?? 0, adopted: counts.adopted ?? 0 })}
            rows={statusTotal === 0 ? [] : summary.proposalStatus.map((row, index) => ({ id: row.status, label: proposalStatusLabel(row.status, locale), value: row.count, color: STATUS_COLOR[index] }))}
            formatValue={formatNumber}
            nameHeader={t("admin.usage.col.status")}
            valueHeader={t("admin.usage.col.proposals")}
            emptyText={t("admin.usage.status.empty")}
          />
          <HBarChart
            title={t("admin.usage.official.title")}
            summary={totals.officialShares === 0 ? t("admin.usage.official.empty") : t("admin.usage.official.summary", { n: totals.officialShares })}
            rows={totals.officialShares === 0 ? [] : officialRows}
            formatValue={formatNumber}
            nameHeader="SNS"
            valueHeader={t("admin.usage.col.requests")}
            emptyText={t("admin.usage.official.empty")}
          />
        </div>
      </div>

      <Section title={t("admin.usage.table.title")}>
        <div className="card card--pad">
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th scope="col">{t("admin.usage.col.challenge")}</th>
                  <th scope="col">{t("admin.usage.col.company")}</th>
                  <th scope="col">{t("admin.usage.col.status")}</th>
                  <th scope="col" className="num">
                    {t("admin.usage.col.applicants")}
                  </th>
                  <th scope="col" className="num">
                    {t("admin.usage.col.proposals")}
                  </th>
                  <th scope="col">{t("admin.usage.col.closes")}</th>
                </tr>
              </thead>
              <tbody>
                {summary.challenges.map((row) => (
                  <tr key={row.id}>
                    <td>{pick(row.title, locale)}</td>
                    <td data-label={t("admin.usage.col.company")}>{pick(row.companyName, locale)}</td>
                    <td data-label={t("admin.usage.col.status")}>
                      <Tag tone={row.status === "open" ? "success" : row.status === "judging" ? "warning" : undefined}>{challengeStatusLabel(row.status, locale)}</Tag>
                    </td>
                    <td className="num" data-label={t("admin.usage.col.applicants")}>
                      {formatNumber(row.applicants)}
                    </td>
                    <td className="num" data-label={t("admin.usage.col.proposals")}>
                      {formatNumber(row.proposals)}
                    </td>
                    <td className="nowrap" data-label={t("admin.usage.col.closes")}>
                      {formatDate(row.closesOn, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* 기간을 고르는 줄은 그 기간으로 바뀌는 것(아래 스파크라인과 한 줄 읽기) 바로 위에 둬요 */}
      <Section title={t("admin.usage.timeline.title")}>
        <div className="adm-filter" role="group" aria-label={t("admin.usage.range")}>
          <span className="adm-filter__label">{t("admin.usage.range")}</span>
          {USAGE_RANGES.map((value) => (
            <button key={value} type="button" className="chip" aria-pressed={range === value} onClick={() => setRange(value)}>
              {t(USAGE_RANGE_LABEL[value])}
            </button>
          ))}
        </div>
        <ChartFrame
          title={t("admin.usage.timeline.total", { n: formatNumber(timeline.total) })}
          hint={t("admin.usage.timeline.hint", { unit: t(USAGE_UNIT_LABEL[timeline.unitDays]) })}
          table={{
            head: [t("admin.usage.col.period"), ...USAGE_EVENT_KINDS.map((kind) => t(USAGE_EVENT_LABEL[kind]))],
            rows: timeline.buckets.map((bucket, index) => [bucketName(index), ...USAGE_EVENT_KINDS.map((kind) => formatNumber(bucket.counts[kind]))]),
          }}
        >
          {periodInsight ? <p className="adm-lead">{periodInsight}</p> : null}
          <div className="adm-sparks">
            {USAGE_EVENT_KINDS.map((kind) => (
              <div key={kind} className="adm-spark">
                <span className="adm-spark__name">{t(USAGE_EVENT_LABEL[kind])}</span>
                <span className="adm-spark__total">{formatNumber(timeline.totals[kind])}</span>
                <div className="adm-spark__graph">
                  <Sparkline values={timelineSeries(timeline, kind)} />
                </div>
              </div>
            ))}
          </div>
        </ChartFrame>
      </Section>
    </>
  );
}
