"use client";

// 응모자·심사(F-303): 챌린지 선택 → 점수순 응모자 → 심사(3항목 1~5점 + 코멘트) → 시상 → 채택(매칭 성립: 수수료 ¥30,000 중 50% 기부)
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import type { AwardKind } from "@sdgs-compass/core/domain";
import { awardLabel } from "@sdgs-compass/core/labels";
import { selectApplicants, type ApplicantVM } from "@sdgs-compass/core/selectors";
import { Banner, Button, ButtonLink, Empty, Field, ScreenHead, Tag } from "@/components/ui";
import { applicantsHref, postNewHref } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { nowIso } from "@/lib/time";

const AWARDS: readonly AwardKind[] = ["grand", "excellence", "special"];

function RateRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const { t } = useSession();
  const id = useId();
  return (
    <div className="rate">
      <label className="rate__label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="range" type="range" min={1} max={5} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-valuetext={t("review.rating", { score: value })} />
      <output className="rate__value" htmlFor={id}>
        {t("review.rating", { score: value })}
      </output>
    </div>
  );
}

function ReviewForm({ applicant }: { applicant: ApplicantVM }) {
  const { t, dispatch } = useSession();
  const existing = applicant.review;
  const [creativity, setCreativity] = useState<number>(existing?.creativity ?? 3);
  const [feasibility, setFeasibility] = useState<number>(existing?.feasibility ?? 3);
  const [sdgContribution, setSdgContribution] = useState<number>(existing?.sdgContribution ?? 3);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saved, setSaved] = useState(false);

  const edit = (change: () => void) => {
    change();
    setSaved(false);
  };
  const save = () => {
    dispatch({ type: "reviewProposal", proposalId: applicant.id, review: { creativity, feasibility, sdgContribution, comment }, at: nowIso() });
    setSaved(true);
  };
  return (
    <div className="review-form">
      <h4 className="strong">{t("review.title")}</h4>
      <RateRow label={t("review.creativity")} value={creativity} onChange={(v) => edit(() => setCreativity(v))} />
      <RateRow label={t("review.feasibility")} value={feasibility} onChange={(v) => edit(() => setFeasibility(v))} />
      <RateRow label={t("review.sdgContribution")} value={sdgContribution} onChange={(v) => edit(() => setSdgContribution(v))} />
      <Field label={t("review.comment")}>
        {(props) => <textarea {...props} className="textarea" value={comment} onChange={(event) => edit(() => setComment(event.target.value))} placeholder={t("review.commentPh")} />}
      </Field>
      <div className="row">
        <Button onClick={save}>{t("review.save")}</Button>
      </div>
      <div className="live" aria-live="polite">
        {saved ? <Banner tone="success">{t("review.saved")}</Banner> : null}
      </div>
    </div>
  );
}

function ApplicantCard({ applicant, feeNote, challengeId }: { applicant: ApplicantVM; feeNote: string; challengeId: string | null }) {
  const { t, locale, dispatch } = useSession();
  const [open, setOpen] = useState(false);
  const [award, setAward] = useState<AwardKind>(applicant.award ?? "excellence");
  const [confirming, setConfirming] = useState(false);
  const statusTone = applicant.status === "adopted" ? "success" : applicant.status === "awarded" ? "warning" : applicant.status === "reviewed" ? "info" : undefined;
  const panelId = `review-${applicant.id}`;

  return (
    <li className="card applicant">
      <div className="row row--between">
        <div className="row">
          <Tag tone={statusTone}>{applicant.statusLabel}</Tag>
          <Tag>{applicant.versionLabel}</Tag>
          {applicant.awardLabel ? <Tag tone="warning">🏆 {applicant.awardLabel}</Tag> : null}
          {applicant.mine ? <Tag tone="info">{t("applicants.mine")}</Tag> : null}
        </div>
        <span className="applicant__score">{applicant.scoreLabel}</span>
      </div>
      <h3 className="applicant__title">{applicant.title}</h3>
      <p className="small muted">{t("applicants.team", { name: applicant.teamName })}</p>
      <p className="small">{applicant.summary}</p>
      <dl className="kv">
        <dt>{t("web.applicants.file")}</dt>
        <dd>{applicant.fileName}</dd>
        <dt>{t("receipt.no")}</dt>
        <dd className="mono">{applicant.receiptNo}</dd>
        <dt>{t("receipt.at")}</dt>
        <dd>{applicant.submittedLabel}</dd>
        {applicant.videoUrl ? (
          <>
            <dt>🎬</dt>
            <dd>
              <a href={applicant.videoUrl} target="_blank" rel="noopener noreferrer">
                {t("web.applicants.video")} ↗
              </a>
            </dd>
          </>
        ) : null}
      </dl>

      <div className="row">
        <Button size="sm" variant="secondary" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
          {open ? "▲" : "▼"} {t("review.title")}
        </Button>
        {applicant.adopted ? <Tag tone="success">✓ {t("review.adopted")}</Tag> : null}
        {/* 수상·채택된 기획서는 이 챌린지를 연결한 홍보 글(F-504)로 알릴 수 있어요 */}
        {applicant.status === "awarded" || applicant.status === "adopted" ? (
          <ButtonLink href={postNewHref("b2b", challengeId)} size="sm" variant="secondary">
            <span aria-hidden="true">📣</span> {t("applicants.promote")}
          </ButtonLink>
        ) : null}
      </div>

      {open ? (
        <div id={panelId} className="stack">
          <ReviewForm applicant={applicant} />
          {!applicant.adopted ? (
            <div className="review-form">
              <div className="row">
                <div className="grow" style={{ minWidth: 160 }}>
                  <Field label={t("web.review.awardKind")}>
                    {(props) => (
                      <select {...props} className="select" value={award} onChange={(event) => setAward(event.target.value as AwardKind)}>
                        {AWARDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {awardLabel(kind, locale)}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </div>
                <Button variant="secondary" onClick={() => dispatch({ type: "awardProposal", proposalId: applicant.id, award })}>
                  🏆 {t("review.award")}
                </Button>
              </div>
              {confirming ? (
                <div className="stack">
                  <Banner tone="info" icon="💗">
                    {feeNote}
                  </Banner>
                  <div className="row">
                    <Button
                      onClick={() => {
                        dispatch({ type: "adoptProposal", proposalId: applicant.id, at: nowIso() });
                        setConfirming(false);
                      }}
                    >
                      {t("common.confirm")}
                    </Button>
                    <Button variant="secondary" onClick={() => setConfirming(false)}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Button onClick={() => setConfirming(true)}>🤝 {t("review.adopt")}</Button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function ApplicantsView({ requestedId }: { requestedId: string | null }) {
  const { demo, locale, t } = useSession();
  const router = useRouter();
  const vm = useMemo(() => selectApplicants(demo, locale, requestedId), [demo, locale, requestedId]);
  return (
    <>
      <ScreenHead title={t("applicants.title")} />
      {vm.challengeOptions.length === 0 ? (
        <Empty>{t("b2b.noChallenges")}</Empty>
      ) : (
        <>
          <div style={{ maxWidth: 560 }}>
            <Field label={t("applicants.pick")}>
              {(props) => (
                <select {...props} className="select" value={vm.selectedId ?? ""} onChange={(event) => router.replace(applicantsHref(event.target.value))}>
                  {vm.challengeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title} ({option.statusLabel})
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          {vm.selected ? (
            <p className="row small muted">
              <Tag tone={vm.selected.status === "open" ? "success" : vm.selected.status === "judging" ? "warning" : undefined}>{vm.selected.statusLabel}</Tag>
              <span>{vm.selected.dDay}</span>
              <span>{vm.selected.applicantsLabel}</span>
            </p>
          ) : null}
          {vm.applicants.length === 0 ? (
            <Empty>{t("applicants.empty")}</Empty>
          ) : (
            <ul className="card-list">
              {vm.applicants.map((applicant) => (
                <ApplicantCard key={applicant.id} applicant={applicant} feeNote={vm.feeNote} challengeId={vm.selectedId} />
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

export function ApplicantsScreen() {
  const id = useSearchParams().get("id");
  return <ApplicantsView key={id ?? ""} requestedId={id} />;
}

