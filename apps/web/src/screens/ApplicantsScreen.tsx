"use client";

// 응모자·심사(F-303): 챌린지 선택 → 점수순 응모자 → 심사(3항목 1~5점 + 코멘트) → 시상 → 채택(매칭 성립: 수수료 ¥30,000 중 50% 기부)
// #25 최우수상을 정하면 맡긴 상금이 수상자의 リワード残高로 송금돼요(데모) — 과제를 고르면 상금 상태를 안내해요
// #33 「すべての課題」와 상태 필터(?id=all&status=submitted 처럼 주소에 남아요) — 대시보드 숫자 카드가 여기로 와요
// #30 심사 점수·코멘트는 학생에게 공개되고 Impact 포인트에 더해진다는 안내를 점수 입력 바로 위에 둬요
// 표창·채택한 아이디어에는 「研究を依頼する」(대학원생 연구자에게 연구 의뢰 — /b2b/research/new/?proposal=)와 이미 낸 의뢰 수가 보여요
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import type { AwardKind } from "@sdgs-compass/core/domain";
import { REVIEW_BONUS_MAX } from "@sdgs-compass/core/impact";
import { awardLabel } from "@sdgs-compass/core/labels";
import { parseApplicantFilter, selectApplicants, type ApplicantFilter, type ApplicantVM } from "@sdgs-compass/core/selectors";
import { proposalResearchLabel } from "@sdgs-compass/core/researchView";
import { prizeNotice } from "@sdgs-compass/core/walletView";
import { Banner, Button, ButtonLink, Empty, Field, ScreenHead, Tag } from "@/components/ui";
import { applicantsHref, b2bResearchHref, postNewHref, researchNewHref } from "@/lib/routes";
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

function ReviewForm({ applicant, onTouched }: { applicant: ApplicantVM; onTouched: () => void }) {
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
    onTouched();
    dispatch({ type: "reviewProposal", proposalId: applicant.id, review: { creativity, feasibility, sdgContribution, comment }, at: nowIso() });
    setSaved(true);
  };
  return (
    <div className="review-form">
      <h4 className="strong">{t("review.title")}</h4>
      <p className="review-form__note">
        <span aria-hidden="true">👀 </span>
        {t("review.publicNote", { max: REVIEW_BONUS_MAX })}
      </p>
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

function ApplicantCard({ applicant, feeNote, showChallenge, onTouched }: { applicant: ApplicantVM; feeNote: string; showChallenge: boolean; onTouched: () => void }) {
  const { t, locale, demo, dispatch } = useSession();
  const research = proposalResearchLabel(demo, applicant.id, locale);
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
          {/* #34 제출 버전 칩: 「第1版」 — 읽어 주는 도구에는 「提出された企画書の第1版」 */}
          <Tag>
            <span aria-hidden="true">{applicant.versionLabel}</span>
            <span className="sr-only">{applicant.versionA11y}</span>
          </Tag>
          {applicant.awardLabel ? <Tag tone="warning">🏆 {applicant.awardLabel}</Tag> : null}
          {applicant.mine ? <Tag tone="info">{t("applicants.mine")}</Tag> : null}
        </div>
        <span className="applicant__score">{applicant.scoreLabel}</span>
      </div>
      {showChallenge ? <p className="applicant__challenge">{applicant.challengeLabel}</p> : null}
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
          <ButtonLink href={postNewHref("b2b", applicant.challengeId)} size="sm" variant="secondary">
            <span aria-hidden="true">📣</span> {t("applicants.promote")}
          </ButtonLink>
        ) : null}
        {/* 표창·채택한 아이디어를 실현하려고 대학원생에게 연구를 의뢰해요 */}
        {applicant.status === "awarded" || applicant.status === "adopted" ? (
          <ButtonLink href={researchNewHref(applicant.id)} size="sm" variant="secondary">
            <span aria-hidden="true">🔬</span> {t("research.b2b.new")}
          </ButtonLink>
        ) : null}
        {research ? (
          <ButtonLink href={b2bResearchHref()} size="sm" variant="ghost">
            {research} ›
          </ButtonLink>
        ) : null}
      </div>

      {open ? (
        <div id={panelId} className="stack">
          <ReviewForm applicant={applicant} onTouched={onTouched} />
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
                <Button
                  variant="secondary"
                  onClick={() => {
                    onTouched();
                    dispatch({ type: "awardProposal", proposalId: applicant.id, award });
                  }}
                >
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
                        onTouched();
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

function ApplicantsView({ requestedId, filter }: { requestedId: string | null; filter: ApplicantFilter }) {
  const { demo, locale, t } = useSession();
  const router = useRouter();
  // 필터를 켠 채 심사·표창·채택한 응모는 상태가 바뀌어도 목록에 남겨요(누르던 카드가 갑자기 사라지지 않게). 과제·필터를 바꾸면 비워져요(key)
  const [kept, setKept] = useState<readonly string[]>([]);
  const keep = (id: string) => setKept((list) => (list.includes(id) ? list : [...list, id]));
  const vm = useMemo(() => selectApplicants(demo, locale, requestedId, filter, kept), [demo, locale, requestedId, filter, kept]);
  // #25 고른 과제의 상금: 예치 중이면 "최우수상을 정하면 송금", 보냈으면 "송금했어요" (데모)
  const prize = useMemo(() => prizeNotice(demo, vm.selectedId, locale), [demo, vm.selectedId, locale]);
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
                <select {...props} className="select" value={vm.selectedId ?? ""} onChange={(event) => router.replace(applicantsHref(event.target.value, vm.filter))}>
                  {vm.challengeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.all ? option.title : `${option.title} (${option.statusLabel})`}
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
          {prize ? (
            <div className="live" aria-live="polite">
              <Banner tone={prize.status === "paid" ? "success" : "info"} icon="💴">
                {prize.text}
              </Banner>
            </div>
          ) : null}
          <div className="chips" role="group" aria-label={t("applicants.filterLabel")}>
            {vm.filters.map((item) => (
              <button key={item.id} type="button" className="chip" aria-pressed={vm.filter === item.id} onClick={() => router.replace(applicantsHref(vm.selectedId, item.id))}>
                {item.label} <span className="chip__count">{item.count}</span>
              </button>
            ))}
          </div>
          {vm.countNote ? (
            <p className="applicants__note">
              <span aria-hidden="true">ℹ️ </span>
              {vm.countNote}
            </p>
          ) : null}
          {vm.applicants.length === 0 ? (
            <Empty>{vm.emptyLabel}</Empty>
          ) : (
            <ul className="card-list">
              {vm.applicants.map((applicant) => (
                <ApplicantCard key={applicant.id} applicant={applicant} feeNote={vm.feeNote} showChallenge={vm.allChallenges} onTouched={() => keep(applicant.id)} />
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

export function ApplicantsScreen() {
  const search = useSearchParams();
  const id = search.get("id");
  const filter = parseApplicantFilter(search.get("status"));
  return <ApplicantsView key={`${id ?? ""}|${filter}`} requestedId={id} filter={filter} />;
}

