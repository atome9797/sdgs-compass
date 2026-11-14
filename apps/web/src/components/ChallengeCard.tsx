"use client";

// 퀘스트 목록(#39): 양피지 두루마리 모양의 「依頼書」. 위아래로 말린 두루마리, 과제 몬스터의 픽셀 그림(밑에 이름) · 의뢰인 ·
// 「課題」(과제를 쉬운 말로, #41 — 게임을 하지 않는 사람도 알 수 있게) · SDG 번호 · 보상,
// 오른쪽 위에는 남은 날을 도장으로(마감 · 심사 중이면 그 상태). 기획서를 낸 퀘스트에는 붉은 「達成」 도장이 찍혀요.
// 종이 어디를 눌러도 퀘스트 상세(전투 화면)로 가요 — 북마크 · 실천 마크 단추는 따로 눌러요.
import Link from "next/link";
import type { ChallengeCardVM } from "@sdgs-compass/core/selectors";
import { challengeHref } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { FoeIcon } from "./battle/FoeIcon";
import { CertMarkButton, CertMarkNote, useMarkDisclosure } from "./CertMark";
import { SdgMiniRow } from "./sdg";

/** 남은 날 도장: 「あと 12日」 · 「本日締切」 · 마감 뒤에는 상태(審査中 · 終了) */
function Seal({ vm, small = false }: { vm: ChallengeCardVM; small?: boolean }) {
  const { t } = useSession();
  const cls = `seal${small ? " seal--small" : ""}${vm.isOpen ? "" : " seal--muted"}`;
  if (!vm.isOpen) {
    return (
      <span className={cls}>
        <span className="seal__big">{vm.statusLabel}</span>
      </span>
    );
  }
  if (vm.daysLeft <= 0) {
    return (
      <span className={cls}>
        <span className="seal__big">{t("scroll.today")}</span>
      </span>
    );
  }
  return (
    <span className={cls}>
      <span className="seal__small">{t("scroll.daysLeft")}</span>
      <span className="seal__big">{t("scroll.days", { days: vm.daysLeft })}</span>
    </span>
  );
}

/** 의뢰서 한 장 (홈의 추천 · 검색 결과) */
export function ChallengeCard({ vm, showReasons = false }: { vm: ChallengeCardVM; showReasons?: boolean }) {
  const { t, dispatch } = useSession();
  const mark = useMarkDisclosure();
  return (
    <article className="scroll" data-testid={`quest-scroll-${vm.id}`}>
      <div className="scroll__paper">
        <p className="scroll__label">
          <span>{t("scroll.title")}</span>
          {vm.isOpen && vm.match !== null ? <span className="scroll__match">{t("home.matchRate", { rate: vm.match })}</span> : null}
        </p>
        <Seal vm={vm} />
        <div className="scroll__main">
          <span className="scroll__monster">
            <span className="scroll__wanted">
              <FoeIcon kind={vm.foe.kind} color={vm.foe.color} label={t("scroll.foeAlt", { foe: vm.foe.name })} />
              {/* 기획서를 낸 퀘스트: 몬스터 그림 위에 도장 — 「挑戦中」, 기업이 고르면(수상) 「達成」(#47) */}
              {vm.stampLabel ? (
                <span className="scroll__cleared" data-stamp={vm.stamp ?? undefined} aria-hidden="true">
                  {vm.stampLabel}
                </span>
              ) : null}
            </span>
            <span className="scroll__foe-name" aria-hidden="true">
              {vm.foe.name}
            </span>
          </span>
          <h3 className="scroll__title">
            <Link className="scroll__link" href={challengeHref(vm.id)}>
              {vm.title}
            </Link>
          </h3>
        </div>
        <p className="scroll__row">
          <span className="scroll__key">{t("scroll.client")}</span>
          <span>
            <span aria-hidden="true">{vm.companyEmoji} </span>
            {vm.companyName}
          </span>
        </p>
        <p className="scroll__row">
          <span className="scroll__key">{t("scroll.problem")}</span>
          <span className="scroll__problem">{vm.problem}</span>
        </p>
        {vm.companyMark ? (
          <div className="scroll__mark">
            <CertMarkButton mark={vm.companyMark} open={mark.open} noteId={mark.noteId} onToggle={mark.toggle} />
          </div>
        ) : null}
        {vm.companyMark ? <CertMarkNote mark={vm.companyMark} open={mark.open} noteId={mark.noteId} /> : null}
        <SdgMiniRow ids={vm.sdgIds} />
        {vm.rewardsLine ? (
          <p className="scroll__row scroll__reward">
            <span className="scroll__key">{t("scroll.reward")}</span>
            <span>{vm.rewardsLine}</span>
          </p>
        ) : null}
        {showReasons && vm.reasons.length > 0 ? (
          <ul className="scroll__reasons">
            {vm.reasons.slice(0, 2).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
        <div className="scroll__foot">
          <span>
            {vm.teamRuleLabel} · {vm.applicantsLabel}
            {vm.submittedVersion !== null ? (
              <>
                {" · "}
                <span className="strong">{t("challenge.submitted", { version: vm.submittedVersion })}</span>
              </>
            ) : null}
          </span>
          <button type="button" className="bookmark" aria-pressed={vm.bookmarked} aria-label={t("challenge.bookmark")} onClick={() => dispatch({ type: "toggleBookmark", challengeId: vm.id })}>
            <span aria-hidden="true">{vm.bookmarked ? "★" : "☆"}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

/** 작은 의뢰서 한 줄 (홈의 「締切が近いクエスト」) */
export function ChallengeRow({ vm }: { vm: ChallengeCardVM }) {
  const { t } = useSession();
  return (
    <Link href={challengeHref(vm.id)} className="scroll scroll--slip" data-testid={`quest-slip-${vm.id}`}>
      <span className="scroll__paper">
        <span className="scroll__wanted">
          <FoeIcon kind={vm.foe.kind} color={vm.foe.color} />
          {vm.stampLabel ? (
            <span className="scroll__cleared scroll__cleared--small" data-stamp={vm.stamp ?? undefined} aria-hidden="true">
              {vm.stampLabel}
            </span>
          ) : null}
        </span>
        <span className="scroll__lines">
          <span className="scroll__title">{vm.title}</span>
          <span className="scroll__row">
            <span className="scroll__key">{t("scroll.client")}</span>
            <span className="scroll__client">{vm.companyName}</span>
          </span>
        </span>
        <Seal vm={vm} small />
      </span>
    </Link>
  );
}
