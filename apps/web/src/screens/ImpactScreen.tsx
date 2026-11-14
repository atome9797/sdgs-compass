"use client";

// SCR-04 마이 포트폴리오 = 용사의 프로필: 스킬(#38 · #45 — 수상으로 얻은 SDG 마다의 스킬과 레벨, 그 밑에 스킬이 된 수상) · 스카우트 수신 설정(따로 된 줄) · 応募中の課題(#28, 낸 기획서가 있을 때만)
// · 용사의 스테이터스(#43 · #45 — SDGs 17항목, 기업의 평가 점수가 EXP 로 쌓여 레벨이 올라요) · 배지 · 참여 실적 · 증명서/요약/카드뉴스 단추 · 맨 아래 リワード残高 카드(#25 데모)
// #30 기업이 내 기획서를 심사·표창하면 応募中の課題 카드에 「企業からの審査結果」(점수 3개 · 코멘트 · 받은 EXP 와 오른 레벨 · 다음에 키울 점 · 수상 · 얻은 스킬)가 붙어요
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { selectApplications, selectImpact, type ApplicationReviewVM, type HeroSkillVM, type SdgSkillVM } from "@sdgs-compass/core/selectors";
import { selectWallet } from "@sdgs-compass/core/walletView";
import { HeroPortrait } from "@/components/battle/HeroPortrait";
import { useQuestClear } from "@/components/battle/QuestClear";
import { StatsWindow } from "@/components/StatsWindow";
import { SdgEmblem, SdgMiniRow } from "@/components/sdg";
import { ButtonLink, Empty, ScreenHead, Section, Tag } from "@/components/ui";
import { buildHref, challengeHref, receiptHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { ActivityItem } from "./HomeScreen";

/** #30 기업의 심사 결과: 점수는 막대 + 「4/5」 글자로(색만으로 구분하지 않아요), 가장 낮은 항목은 「次に伸ばすポイント」 한 줄로도 알려요 */
function ReviewResult({ review, id, proposalId }: { review: ApplicationReviewVM; id: string; proposalId: string }) {
  const titleId = `review-result-${id}`;
  const clear = useQuestClear();
  const { t } = useSession();
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
      {/* 수상하면 그 퀘스트의 SDG 마다 스킬을 「おぼえた！」 · 이미 있던 SDG 는 「レベルアップ！」(#38 · #45) */}
      {review.skillLearned ? (
        <div className="skill-learned">
          <span className="skill-learned__icons" aria-hidden="true">
            {review.skillLearned.sdgIds.map((id) => (
              <SdgEmblem key={id} id={id} size={22} />
            ))}
          </span>
          <span className="skill-learned__lines">
            {review.skillLearned.learnedLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        </div>
      ) : null}
      {/* 받은 보상(#37 · #47): 상품이면 「〇〇を手に入れた！」, 상금이면 「賞金 …を受け取りました」, 아직 고르지 않았으면 고르는 단추 */}
      {review.rewardItemLabel ? (
        <p className="item-won">
          <span aria-hidden="true">🎁</span> {review.rewardItemLabel}
        </p>
      ) : null}
      {review.prizeLabel ? (
        <p className="item-won">
          <span aria-hidden="true">💴</span> {review.prizeLabel}
        </p>
      ) : null}
      {review.rewardPending ? (
        <div className="reward-pending">
          <p>{t("impact.rewardPending")}</p>
          <button type="button" className="btn reward-pending__btn" onClick={() => clear?.open(proposalId)} data-testid={`reward-open-${id}`}>
            🎁 {t("clear.choose")}
          </button>
        </div>
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
      {/* 평가 점수는 상과 관계없이 그 퀘스트의 SDG 항목에 EXP 로 들어가요(#45) — 레벨이 오르면 한 줄씩 */}
      {review.averageLabel || review.expLabel ? (
        <p className="review-result__total">
          {review.averageLabel ? <span className="strong">{review.averageLabel}</span> : null}
          {review.expLabel ? <span className="review-result__exp">{review.expLabel}</span> : null}
        </p>
      ) : null}
      {review.statusLevelUps.length > 0 ? (
        <ul className="review-levelups">
          {review.statusLevelUps.map((line) => (
            <li key={line}>
              <span aria-hidden="true">⬆ </span>
              {line}
            </li>
          ))}
        </ul>
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

/** SDG 스킬 하나(#45): 문장 · 번호와 스킬 레벨(= 그 SDG 의 수상 수) · 공식 이름 · 「受賞 2件」 */
function SdgSkillTile({ skill }: { skill: SdgSkillVM }) {
  return (
    <li className="sdg-skill" aria-label={skill.ariaLabel}>
      <span className="sdg-skill__slot" aria-hidden="true">
        <SdgEmblem id={skill.sdgId} size={30} />
      </span>
      <span className="sdg-skill__main" aria-hidden="true">
        <span className="sdg-skill__head">
          <span className="sdg-skill__no" style={{ background: skill.color, color: skill.textColor }}>
            {skill.sdgId}
          </span>
          <span className="sdg-skill__level">{skill.levelLabel}</span>
        </span>
        {/* 목표의 공식 이름은 칸의 너비를 다 써서(좁은 화면에서도 낱말 중간에서 덜 끊기게) */}
        <span className="sdg-skill__goal">{skill.goal}</span>
        <span className="sdg-skill__count">{skill.countLabel}</span>
      </span>
    </li>
  );
}

/** 스킬이 된 수상 한 줄(#38): 왼쪽에 대표 SDG 의 문장과 번호, 이름 · ★(상의 세기) · 상 · 기업 · 날짜 · 수상한 퀘스트 · 스킬을 얻은 SDG 번호 모두 */
function SkillRow({ skill }: { skill: HeroSkillVM }) {
  return (
    <li className="skill" aria-label={skill.ariaLabel}>
      {/* 스킬의 대표 SDG 의 문장(#42) + 번호 */}
      <span className="skill__badge" aria-hidden="true">
        <SdgEmblem id={skill.sdgId} size={34} />
        <span className="skill__type" style={{ background: skill.color, color: skill.textColor }}>
          {skill.sdgId}
        </span>
      </span>
      <div className="skill__main">
        <p className="skill__name">
          {skill.name}
          <span className="skill__stars" aria-hidden="true">
            {"★".repeat(skill.stars)}
            <span className="skill__stars-off">{"★".repeat(3 - skill.stars)}</span>
          </span>
        </p>
        <p className="skill__meta">{skill.metaLabel}</p>
        <p className="skill__quest">{skill.questLabel}</p>
        <SdgMiniRow ids={skill.sdgIds} />
      </div>
    </li>
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

      <section className="card profile status" aria-labelledby="status-title">
        <h2 className="sr-only" id="status-title">
          {t("impact.status")}
        </h2>
        <div className="profile__top">
          <HeroPortrait skillSdgIds={vm.sdgSkills.map((skill) => skill.sdgId)} label={t("battle.heroName", { name: vm.nickname })} />
          <div className="grow">
            <p className="status__name">{t("battle.heroName", { name: vm.nickname })}</p>
            <p className="small muted">
              {vm.university} · {vm.faculty}
            </p>
            <p className="profile__total">{vm.skillCountLabel}</p>
          </div>
        </div>
        {/* 스킬 = 수상 경력(#38 · #45): 수상한 퀘스트의 SDG 마다 스킬, 같은 SDG 의 수상이 쌓이면 레벨이 올라요(돈과 무관한 기록) */}
        <div className="stack stack--sm">
          <p className="section__title">{t("impact.skills")}</p>
          {vm.sdgSkills.length === 0 ? (
            <p className="small muted">{t("impact.skillsEmpty")}</p>
          ) : (
            <>
              <ul className="sdg-skill-grid" data-testid="sdg-skills">
                {vm.sdgSkills.map((skill) => (
                  <SdgSkillTile key={skill.sdgId} skill={skill} />
                ))}
              </ul>
              <p className="skill-records__title">{t("impact.skillRecords")}</p>
              <ul className="skill-list">
                {vm.skills.map((skill) => (
                  <SkillRow key={skill.id} skill={skill} />
                ))}
              </ul>
            </>
          )}
          <p className="small muted">{vm.skillsHint}</p>
        </div>
        {/* 스카우트 수신은 스킬과 관계없는 "설정"이라, 선으로 나눈 따로 된 줄에 상태 + 설명 + 설정 링크로 보여요 */}
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
                  {app.review ? <ReviewResult review={app.review} id={app.challengeId} proposalId={app.proposalId} /> : null}
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

      {/* 용사의 스테이터스(#43 · #45): SDGs 17항목 — 기업의 평가 점수가 EXP 로 쌓여 항목마다 레벨이 올라요 */}
      <StatsWindow stats={vm.stats} />

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
        <p className="small muted">{wallet.notices.skills}</p>
        <Link className="link-more" href={buildHref(ROUTES.wallet)}>
          {t("wallet.more")} →
        </Link>
      </section>
    </div>
  );
}
