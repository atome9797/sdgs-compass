"use client";

// SCR-04 마이 포트폴리오: 임팩트 레벨·진행률(포인트 숫자는 보이지 않아요) · 스카우트 수신 설정(따로 된 줄) · 応募中の課題(#28, 낸 기획서가 있을 때만)
// · 17개 SDGs 레이더 차트 · 강점 SDGs · 배지 · 참여 실적 · 증명서/요약/카드뉴스 단추 · 맨 아래 リワード残高 카드(#25 데모)
// #30 기업이 내 기획서를 심사·표창하면 応募中の課題 카드에 「企業からの審査結果」(점수 3개 · 코멘트 · 반영 포인트 · 다음에 키울 점 · 수상)가 붙어요
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { sdgLabel } from "@sdgs-compass/core/labels";
import { selectApplications, selectImpact, type ApplicationReviewVM } from "@sdgs-compass/core/selectors";
import { selectWallet } from "@sdgs-compass/core/walletView";
import { RadarChart } from "@/components/RadarChart";
import { SdgMiniRow } from "@/components/sdg";
import { ButtonLink, Empty, ScreenHead, Section, Tag } from "@/components/ui";
import { buildHref, challengeHref, receiptHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { ActivityItem } from "./HomeScreen";

/** #30 기업의 심사 결과: 점수는 막대 + 「4/5」 글자로(색만으로 구분하지 않아요), 가장 낮은 항목은 「次に伸ばすポイント」 한 줄로도 알려요 */
function ReviewResult({ review, id }: { review: ApplicationReviewVM; id: string }) {
  const titleId = `review-result-${id}`;
  return (
    <div className="review-result" role="group" aria-labelledby={titleId}>
      <div className="review-result__head">
        <p className="review-result__title" id={titleId}>
          {review.title}
        </p>
        {review.awardLabel ? (
          <Tag tone="warning">
            <span aria-hidden="true">🏆</span> {review.awardLabel}
          </Tag>
        ) : null}
      </div>
      {/* 상품 보상이 걸린 퀘스트에서 수상하면 「〇〇を手に入れた！」(#37) */}
      {review.rewardItemLabel ? (
        <p className="item-won">
          <span aria-hidden="true">🎁</span> {review.rewardItemLabel}
        </p>
      ) : null}
      {review.scores.length > 0 ? (
        <ul className="review-scores">
          {review.scores.map((score) => (
            <li key={score.key} className={score.lowest ? "review-score review-score--low" : "review-score"}>
              <span className="review-score__label">{score.label}</span>
              <span className="review-score__bar" aria-hidden="true">
                <span style={{ width: `${(score.value / score.max) * 100}%` }} />
              </span>
              <span className="review-score__value">{score.valueLabel}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {review.averageLabel || review.bonusLabel ? (
        <p className="review-result__total">
          {review.averageLabel ? <span className="strong">{review.averageLabel}</span> : null}
          {review.bonusLabel ? <span className="review-result__bonus">{review.bonusLabel}</span> : null}
        </p>
      ) : null}
      {review.improveLabel ? (
        <p className="review-result__improve">
          <span aria-hidden="true">🌱 </span>
          {review.improveLabel}
        </p>
      ) : null}
      {review.comment ? (
        <figure className="review-result__comment">
          <figcaption>{review.commentBy}</figcaption>
          <blockquote>{review.comment}</blockquote>
        </figure>
      ) : null}
    </div>
  );
}

export function ImpactScreen() {
  const { demo, locale, t } = useSession();
  const vm = useMemo(() => selectImpact(demo, locale), [demo, locale]);
  const applications = useMemo(() => selectApplications(demo, locale), [demo, locale]);
  const wallet = useMemo(() => selectWallet(demo, locale), [demo, locale]);
  // 수령증의 「マイImpactを見る」로 오면 주소에 방금 낸 과제(just)가 붙어 있어요 — 그 과제를 강조해요
  const just = useSearchParams().get("just");
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
          {/* 경험치(EXP) 막대 — 게임 테마(#37) */}
          <div className="progress progress--exp" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={vm.progressPercent} aria-label={vm.nextLevelLabel}>
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


      {/* #28 응모 중인 과제: 기획서를 낸 뒤 어느 기업의 어느 과제에 냈는지 첫 화면에서 보여요(낸 것이 없으면 칸째 숨겨요) */}
      {applications.length > 0 ? (
        <Section title={t("impact.applications")} hint={t("impact.applicationsHint")}>
          <ul className="card-list">
            {applications.map((app) => {
              const fresh = app.challengeId === just;
              return (
                <li key={app.challengeId} className={fresh ? "card applied applied--new" : "card applied"}>
                  <p className="applied__company">{app.companyName}</p>
                  <p className="applied__title">{app.challengeTitle}</p>
                  <div className="applied__tags">
                    {fresh ? <Tag tone="success">✓ {t("impact.justSubmitted")}</Tag> : null}
                    <Tag tone={app.status === "open" ? "info" : "warning"}>{app.statusLabel}</Tag>
                    <Tag>{app.versionLabel}</Tag>
                  </div>
                  {app.deadlineLabel ? <p className="applied__meta">{app.deadlineLabel}</p> : null}
                  <SdgMiniRow ids={app.sdgIds} />
                  {app.review ? <ReviewResult review={app.review} id={app.challengeId} /> : null}
                  <div className="applied__links">
                    <Link className="link-more" href={challengeHref(app.challengeId)}>
                      {t("impact.viewChallenge")} →
                    </Link>
                    <Link className="link-more" href={receiptHref(app.challengeId)}>
                      {t("challenge.viewReceipt")} →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

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

      {/* 받은 상금(데모): 돈은 레벨과 따로 — 레벨은 바꿀 수 없다는 고지 ③ 을 카드에 함께 보여요.
          맨 아래에 둬요(#28): 제출 직후 첫 화면에서 지난 샘플 상금이 방금 낸 기획서의 결과처럼 보이지 않게 */}
      <section className="card card--pad wallet-card" aria-label={t("wallet.title")}>
        <div className="wallet-card__row">
          <p className="strong">
            <span aria-hidden="true">💴</span> {t("wallet.title")} <Tag tone="warning">{t("wallet.demo")}</Tag>
          </p>
          <span className="wallet-card__balance">{wallet.totalLabel}</span>
        </div>
        <p className="small muted">{t("wallet.cardNote")}</p>
        <p className="small muted">{wallet.notices.level}</p>
        <Link className="link-more" href={buildHref(ROUTES.wallet)}>
          {t("wallet.more")} →
        </Link>
      </section>
    </div>
  );
}
