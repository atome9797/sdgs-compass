"use client";

// SCR-02 챌린지 상세: 기업 브리핑(상세 요강) · 팀원 모집 게시판 · 북마크 · 참가 신청/재제출/수령증
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SKILL_IDS, type SkillId } from "@sdgs-compass/core/domain";
import { skillLabel } from "@sdgs-compass/core/labels";
import { coverColors } from "@sdgs-compass/core/theme";
import { selectChallengeDetail, type TeamPostVM } from "@sdgs-compass/core/selectors";
import { SdgMiniRow } from "@/components/sdg";
import { Banner, Button, ButtonLink, Empty, Field, ScreenHead, Section, Tag } from "@/components/ui";
import { buildHref, receiptHref, ROUTES, submitHref } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { nowIso } from "@/lib/time";

type TabId = "detail" | "team";

function TeamPost({ post }: { post: TeamPostVM }) {
  const { t, dispatch } = useSession();
  return (
    <li className={post.mine ? "card post post--mine" : "card post"}>
      <div className="row row--between">
        <span className="small muted">{post.authorLabel}</span>
        <span className="small muted">{post.dateLabel}</span>
      </div>
      <p className="post__title">{post.title}</p>
      {post.body ? <p className="small">{post.body}</p> : null}
      <div className="chips">
        {post.roles.map((role) => (
          <Tag key={role} tone="info">
            {role}
          </Tag>
        ))}
        {post.mine ? <Tag tone="success">{t("team.myPost")}</Tag> : null}
      </div>
      <div className="row row--between">
        <span className="small muted">{post.requestsLabel}</span>
        {post.requestedByMe ? (
          <Tag tone="success">✓ {t("team.requested")}</Tag>
        ) : post.canRequest ? (
          <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "requestTeam", postId: post.id })}>
            {t("team.request")}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function NewPostForm({ challengeId, onDone }: { challengeId: string; onDone: () => void }) {
  const { t, locale, dispatch } = useSession();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [roles, setRoles] = useState<SkillId[]>([]);
  const [tried, setTried] = useState(false);
  const titleError = tried && title.trim() === "" ? t("team.errorTitle") : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (title.trim() === "") return;
    dispatch({ type: "addTeamPost", challengeId, title, body, rolesWanted: roles, at: nowIso() });
    onDone();
  };
  const toggle = (id: SkillId) => setRoles((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  return (
    <form className="card card--pad stack" onSubmit={submit} noValidate>
      <h3 className="section__title">{t("team.new")}</h3>
      <Field label={t("team.postTitle")} error={titleError}>
        {(props) => <input {...props} className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("team.postTitlePh")} maxLength={60} />}
      </Field>
      <Field label={t("team.postBody")}>{(props) => <textarea {...props} className="textarea" value={body} onChange={(event) => setBody(event.target.value)} placeholder={t("team.postBodyPh")} maxLength={300} />}</Field>
      <div className="stack stack--sm">
        <p className="field__label">{t("team.rolesWanted")}</p>
        <div className="chips" role="group" aria-label={t("team.rolesWanted")}>
          {SKILL_IDS.map((id) => (
            <button key={id} type="button" className="chip" aria-pressed={roles.includes(id)} onClick={() => toggle(id)}>
              {skillLabel(id, locale)}
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <Button type="submit">{t("team.publish")}</Button>
        <Button variant="ghost" onClick={onDone}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

function ChallengeView({ id }: { id: string }) {
  const { demo, locale, t, dispatch } = useSession();
  const [tab, setTab] = useState<TabId>("detail");
  const [composing, setComposing] = useState(false);
  const vm = selectChallengeDetail(demo, id, locale);

  if (!vm) {
    return (
      <div className="screen">
        <ScreenHead title={t("challenge.notFound")} back={buildHref(ROUTES.home)} backLabel={t("common.back")} />
        <ButtonLink href={buildHref(ROUTES.search)}>{t("nav.search")}</ButtonLink>
      </div>
    );
  }

  const { card } = vm;
  const { from, to } = coverColors(card.hue);
  const tabs: { id: TabId; label: string }[] = [
    { id: "detail", label: t("challenge.tabDetail") },
    { id: "team", label: t("challenge.tabTeam") },
  ];

  return (
    <div className="screen">
      <ScreenHead title={t("web.challenge.detail")} back={buildHref(ROUTES.search)} backLabel={t("common.back")} />

      <section className="card hero" aria-labelledby="challenge-title">
        <div className="hero__cover" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
          <span className="hero__emoji" aria-hidden="true">
            {card.companyEmoji}
          </span>
          <span className="ccard__pill ccard__pill--dday">{card.dDay}</span>
          {!card.isOpen ? <span className="ccard__pill ccard__pill--status">{card.statusLabel}</span> : null}
        </div>
        <div className="hero__body">
          <h2 id="challenge-title" className="hero__title">
            {card.title}
          </h2>
          <p className="muted small">
            🏢 {vm.company.name}
            {vm.company.verified ? " ✓" : ""}
          </p>
          <SdgMiniRow ids={card.sdgIds} />
          <div className="facts">
            <div className="fact">
              <span className="fact__label">{t("reward.prize")}</span>
              <span className="fact__value">{card.prizeLabel ?? t("common.none")}</span>
            </div>
            <div className="fact">
              <span className="fact__label">{t("challenge.deadline")}</span>
              <span className="fact__value">{card.closesOnLabel}</span>
            </div>
            <div className="fact">
              <span className="fact__label">{t("challenge.rewards")}</span>
              <span className="fact__value">{card.rewardLabels.join(" / ") || t("common.none")}</span>
            </div>
            <div className="fact">
              <span className="fact__label">{t("challenge.impact")}</span>
              <span className="fact__value">{card.impactLabel}</span>
            </div>
          </div>
          <p className="small muted">
            {card.applicantsLabel} · {t("challenge.participation")}: {card.participationLabel}
          </p>
        </div>
      </section>

      <section className="stack" aria-label={t("challenge.apply")}>
        {vm.canApply ? (
          <ButtonLink href={submitHref(card.id)} block>
            {vm.hasSubmitted ? t("challenge.resubmit") : t("challenge.apply")}
          </ButtonLink>
        ) : vm.hasSubmitted ? null : (
          <Banner tone="warning">{t("challenge.closedNotice")}</Banner>
        )}
        {vm.hasSubmitted ? (
          <div className="row">
            <Tag tone="success">✓ {t("challenge.submitted", { version: card.submittedVersion ?? 1 })}</Tag>
            <Link className="link-more" href={receiptHref(card.id)}>
              {t("challenge.viewReceipt")}
            </Link>
          </div>
        ) : null}
        <div className="row">
          <Button variant="secondary" size="sm" aria-pressed={card.bookmarked} onClick={() => dispatch({ type: "toggleBookmark", challengeId: card.id })}>
            {card.bookmarked ? `★ ${t("challenge.bookmarked")}` : `☆ ${t("challenge.bookmark")}`}
          </Button>
          {card.bookmarked ? <span className="small muted">{t("challenge.bookmarkHint")}</span> : null}
        </div>
      </section>

      <div>
        <div className="tabs" role="tablist" aria-label={card.title}>
          {tabs.map((item) => (
            <button key={item.id} type="button" role="tab" id={`tab-${item.id}`} aria-selected={tab === item.id} aria-controls={`panel-${item.id}`} className="tabs__tab" onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "detail" ? (
        <div role="tabpanel" id="panel-detail" aria-labelledby="tab-detail" className="stack stack--lg">
          <Section title={t("challenge.background")}>
            <p className="prose">{vm.background}</p>
          </Section>
          <Section title={t("challenge.mission")}>
            <p className="prose">{vm.mission}</p>
          </Section>
          <Section title={t("challenge.deliverables")}>
            <div className="prose">
              <ul>
                {vm.deliverables.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </Section>
          {vm.skills.length > 0 ? (
            <Section title={t("team.rolesWanted")}>
              <div className="chips">
                {vm.skills.map((skill) => (
                  <Tag key={skill} tone="info">
                    {skill}
                  </Tag>
                ))}
              </div>
            </Section>
          ) : null}
          <Section title={t("challenge.criteria")}>
            <p className="prose small muted">{t("challenge.criteriaDesc")}</p>
          </Section>
          <Section title={t("challenge.schedule")}>
            <dl className="kv card card--pad">
              <dt>{t("challenge.opensOn")}</dt>
              <dd>{vm.opensOnLabel}</dd>
              <dt>{t("challenge.closesOn")}</dt>
              <dd>{card.closesOnLabel}</dd>
            </dl>
          </Section>
          <Section title={t("challenge.company")}>
            <div className="card card--pad stack stack--sm">
              <p className="strong">
                {vm.company.emoji} {vm.company.name}
                {vm.company.verified ? " ✓" : ""}
              </p>
              <p className="small muted">
                {vm.company.industry} · {vm.company.region}
              </p>
              <p className="small">{vm.company.about}</p>
            </div>
          </Section>
        </div>
      ) : (
        <div role="tabpanel" id="panel-team" aria-labelledby="tab-team" className="stack">
          {composing ? (
            <NewPostForm challengeId={card.id} onDone={() => setComposing(false)} />
          ) : (
            <Button variant="secondary" onClick={() => setComposing(true)}>
              ＋ {t("team.new")}
            </Button>
          )}
          {vm.teamPosts.length === 0 ? (
            <Empty>{t("team.empty")}</Empty>
          ) : (
            <ul className="card-list">
              {vm.teamPosts.map((post) => (
                <TeamPost key={post.id} post={post} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function ChallengeScreen() {
  const id = useSearchParams().get("id") ?? "";
  // 다른 챌린지로 옮기면 탭·입력 상태를 새로 시작해요
  return <ChallengeView key={id} id={id} />;
}

