"use client";

// 기업 네트워크 화면들과 평가가 같이 쓰는 부품: 의뢰 전환(연구 · 기업) · 신뢰 표시 · 기업 카드 · 의뢰 카드 · 별 · 평가(폼 · 표시)
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { RaterRole, Rating } from "@sdgs-compass/core/domain";
import { validateRating, WORK_LIMITS } from "@sdgs-compass/core/network";
import { ratingErrorText, ratingSlot, starsText, type NetworkCompanyVM, type RatingVM, type TrustVM, type WorkCardVM } from "@sdgs-compass/core/networkView";
import { charCount } from "@sdgs-compass/core/proposal";
import { tint } from "@sdgs-compass/core/theme";
import { b2bResearchHref, buildHref, networkCompanyHref, networkNewHref, ROUTES, workRequestHref } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { nowIso } from "@/lib/time";
import { Banner, Button, ButtonLink, Counter, Field, Tag } from "./ui";

/** 「依頼」 탭 맨 위: 연구 의뢰(대학원생) ↔ 기업 네트워크 */
export function RequestsHub({ current }: { current: "research" | "network" }) {
  const { t } = useSession();
  return (
    <nav className="hub" aria-label={t("network.hub.label")}>
      <Link className="chip" href={b2bResearchHref()} aria-current={current === "research" ? "page" : undefined}>
        <span aria-hidden="true">🔬</span> {t("network.hub.research")}
      </Link>
      <Link className="chip" href={buildHref(ROUTES.b2bNetwork)} aria-current={current === "network" ? "page" : undefined}>
        <span aria-hidden="true">🤝</span> {t("network.hub.network")}
      </Link>
    </nav>
  );
}

export function Logo({ emoji, accent, size = 40 }: { emoji: string; accent: string; size?: number }) {
  return (
    <span className="rcard__logo" style={{ width: size, height: size, fontSize: Math.round(size * 0.55), background: tint(accent, 0.16), borderColor: tint(accent, 0.45) }} aria-hidden="true">
      {emoji}
    </span>
  );
}

/** 신뢰 기업 표시 한 줄: 배지 · 평가 평균 · 거래 수 · 지급 지연 */
export function TrustLine({ trust, long = false }: { trust: TrustVM; long?: boolean }) {
  return (
    <p className="trust">
      <Tag tone={trust.trusted ? "success" : undefined}>
        {trust.trusted ? "✓ " : ""}
        {trust.badge}
      </Tag>
      <span className="trust__rating">{trust.ratingLabel}</span>
      <span>{long ? trust.dealsLabel : trust.dealsShort}</span>
      {trust.lateLabel ? <Tag tone="danger">{trust.lateLabel}</Tag> : null}
    </p>
  );
}

/** 찾기 목록의 기업 카드 */
export function CompanyCard({ vm }: { vm: NetworkCompanyVM }) {
  const { t } = useSession();
  return (
    <article className="card rcard">
      <div className="rcard__head">
        <Logo emoji={vm.emoji} accent={vm.accent} />
        <div className="grow">
          <h3 className="rcard__title">
            <Link href={networkCompanyHref(vm.id)}>{vm.name}</Link>
          </h3>
          <p className="rcard__company">
            {vm.region} · {vm.industry}
          </p>
        </div>
      </div>
      <TrustLine trust={vm.trust} />
      <div className="chips" aria-label={t("network.filter.label")}>
        {vm.offers.map((o) => (
          <Tag key={o.id} tone="info">
            {o.label}
          </Tag>
        ))}
      </div>
      {vm.offerNote ? <p className="ncard__offer">{vm.offerNote}</p> : null}
      <div className="row">
        {vm.canRequest ? (
          <ButtonLink href={networkNewHref({ to: vm.id })} size="sm">
            <span aria-hidden="true">🤝</span> {t("network.requestShort")}
          </ButtonLink>
        ) : null}
        <ButtonLink href={networkCompanyHref(vm.id)} size="sm" variant="secondary">
          {t("network.profile")} ›
        </ButtonLink>
      </div>
    </article>
  );
}

/** 의뢰 카드: 의뢰한 기업 → 맡은 기업 · 상태 · 제목(상세로) · 분야 · 의뢰비 · 납기 · 응모 수 · 우리 회사의 할 일 */
export function WorkCard({ vm }: { vm: WorkCardVM }) {
  const { t } = useSession();
  return (
    <article className="card rcard">
      <div className="rcard__head">
        <Logo emoji={vm.fromEmoji} accent={vm.fromAccent} />
        <p className="rcard__company grow">{vm.partiesLabel}</p>
        <Tag tone={vm.statusTone}>{vm.statusLabel}</Tag>
      </div>
      <h3 className="rcard__title">
        <Link href={workRequestHref(vm.id)}>{vm.title}</Link>
      </h3>
      <div className="rcard__facts">
        <Tag tone="info">{vm.categoryLabel}</Tag>
        <span>{vm.modeLabel}</span>
        <span>
          {t("network.budget")} <span className="rcard__fee">{vm.budgetLabel}</span>
        </span>
        <span>{vm.dueLabel}</span>
        {vm.dDay ? <Tag tone={vm.overdue ? "danger" : undefined}>{vm.dDay}</Tag> : null}
        {vm.applicationsLabel ? <span>{vm.applicationsLabel}</span> : null}
        {vm.relation === "applicant" ? <Tag tone="info">{t("network.applied")}</Tag> : null}
      </div>
      {vm.todoLabel ? (
        <div>
          <ButtonLink href={workRequestHref(vm.id)} size="sm">
            {vm.todoLabel} ›
          </ButtonLink>
        </div>
      ) : null}
    </article>
  );
}

export function Stars({ stars, label }: { stars: number; label: string }) {
  return (
    <span className="rstars" role="img" aria-label={label}>
      {starsText(stars)}
    </span>
  );
}

/** 받은 평가 한 건 */
export function RatingItem({ vm, title }: { vm: RatingVM; title?: string }) {
  return (
    <div className="rating">
      {title ? <p className="small strong">{title}</p> : null}
      <p className="row">
        <Stars stars={vm.stars} label={vm.starsLabel} />
        <span className="strong">{vm.comment}</span>
      </p>
      <p className="rating__line">{vm.line}</p>
    </div>
  );
}

type RatingTarget = { kind: Rating["kind"]; refId: string; toRole: Rating["toRole"]; toId: string };

/** 평가 폼: 별(1~5, 라디오) + 한마디 → 보내기. 보내면 이 거래의 내 평가로 바뀌어요 */
function RatingForm({ role, target, title, onSent }: { role: RaterRole; target: RatingTarget; title: string; onSent: () => void }) {
  const { demo, locale, t, dispatch } = useSession();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const draft = { ...target, stars, comment };
    const problem = validateRating(demo, role, draft);
    if (problem !== null) {
      setError(ratingErrorText(problem, locale));
      return;
    }
    dispatch({ type: "rate", role, draft, at: nowIso() });
    onSent();
  };
  const count = charCount(comment.trim());
  return (
    <form className="rating stack stack--sm" onSubmit={submit} noValidate>
      <p className="strong">⭐ {title}</p>
      <p className="small muted">{t("rating.hint")}</p>
      <div className="stars-input" role="radiogroup" aria-label={t("rating.stars")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={t("rating.star", { n })}
            className={n <= stars ? "stars-input__on" : undefined}
            onClick={() => {
              setStars(n);
              setError(null);
            }}
          >
            {n <= stars ? "★" : "☆"}
          </button>
        ))}
      </div>
      <Field label={t("rating.comment", { max: WORK_LIMITS.comment })} error={error} right={<Counter text={`${count}/${WORK_LIMITS.comment}`} over={count > WORK_LIMITS.comment} />}>
        {(props) => (
          <input
            {...props}
            className="input"
            value={comment}
            placeholder={t("rating.commentPh")}
            onChange={(event) => {
              setComment(event.target.value);
              setError(null);
            }}
          />
        )}
      </Field>
      <div>
        <Button type="submit" size="sm">
          {t("rating.submit")}
        </Button>
      </div>
    </form>
  );
}

/**
 * 거래가 끝난 자리의 평가 칸: 이미 평가했으면 내 평가를, 평가할 수 있으면 폼을 보여 줘요(아니면 아무것도 없어요).
 * children 은 내 평가 아래에 덧붙일 것(예: 상대가 남긴 평가). fold 이면 폼을 「⭐ 評価する」 아래에 접어 둬요(목록 안에서).
 */
export function RatingBlock({ role, target, title, fold = false, children }: { role: RaterRole; target: RatingTarget; title: string; fold?: boolean; children?: ReactNode }) {
  const { demo, locale, t } = useSession();
  const [sent, setSent] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const slot = ratingSlot(demo, role, target, locale);
  const done = sent && slot.mine !== null;
  // 보낸 폼이 사라지면 포커스가 갈 곳을 잃으니, 평가 칸으로 옮겨요
  useEffect(() => {
    if (done) box.current?.focus();
  }, [done]);
  if (!slot.mine && !slot.canRate && !children) return null;
  const form = slot.canRate ? <RatingForm role={role} target={target} title={title} onSent={() => setSent(true)} /> : null;
  return (
    <div className="stack stack--sm focus-target" ref={box} tabIndex={-1}>
      <div className="live" aria-live="polite">
        {done ? (
          <Banner tone="success" icon="⭐">
            {t("rating.done")}
          </Banner>
        ) : null}
      </div>
      {slot.mine ? (
        <RatingItem vm={slot.mine} title={t("rating.mine")} />
      ) : form && fold ? (
        <details className="rating-fold">
          <summary>⭐ {title}</summary>
          {form}
        </details>
      ) : (
        form
      )}
      {children}
    </div>
  );
}
