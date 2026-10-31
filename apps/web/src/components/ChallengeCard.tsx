"use client";

import Link from "next/link";
import { coverColors } from "@sdgs-compass/core/theme";
import type { ChallengeCardVM } from "@sdgs-compass/core/selectors";
import { challengeHref } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { Tag } from "./ui";
import { SdgMiniRow } from "./sdg";

/** 챌린지 카드: 표지(그라데이션 + 회사 이모지 + D-day + 매칭률) · 제목 · 기업 · SDG 타일 · 상금/특전 · 응모자 · 북마크 */
export function ChallengeCard({ vm, showReasons = false }: { vm: ChallengeCardVM; showReasons?: boolean }) {
  const { t, dispatch } = useSession();
  const { from, to } = coverColors(vm.hue);
  const prizeWord = t("reward.prize");
  const rewards = vm.rewardLabels.filter((label) => label !== prizeWord);
  return (
    <article className="card ccard">
      <div className="ccard__cover" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
        <span className="ccard__emoji" aria-hidden="true">
          {vm.companyEmoji}
        </span>
        {!vm.isOpen ? <span className="ccard__pill ccard__pill--status">{vm.statusLabel}</span> : null}
        <span className="ccard__pill ccard__pill--dday">{vm.dDay}</span>
        {vm.isOpen && vm.match !== null ? <span className="ccard__pill ccard__pill--match">{t("home.matchRate", { rate: vm.match })}</span> : null}
      </div>
      <div className="ccard__body">
        <h3 className="ccard__title">
          <Link href={challengeHref(vm.id)}>{vm.title}</Link>
        </h3>
        <p className="ccard__company">🏢 {vm.companyName}</p>
        <SdgMiniRow ids={vm.sdgIds} />
        <div className="chips">
          {vm.prizeLabel ? <Tag tone="warning">💰 {vm.prizeLabel}</Tag> : null}
          {rewards.map((label) => (
            <Tag key={label} tone="success">
              {label}
            </Tag>
          ))}
          <Tag>{vm.participationLabel}</Tag>
        </div>
        {showReasons && vm.reasons.length > 0 ? (
          <ul className="ccard__reasons">
            {vm.reasons.slice(0, 2).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
        <div className="ccard__foot">
          <span>
            {vm.applicantsLabel}
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

/** 한 줄짜리 챌린지 목록 항목 (홈의 "마감 임박"처럼 카드가 너무 클 때) */
export function ChallengeRow({ vm }: { vm: ChallengeCardVM }) {
  const { from, to } = coverColors(vm.hue);
  return (
    <Link href={challengeHref(vm.id)} className="card mgmt-row" style={{ color: "inherit" }}>
      <span className="mgmt-row__cover" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} aria-hidden="true">
        {vm.companyEmoji}
      </span>
      <span className="mgmt-row__main">
        <span className="mgmt-row__title">{vm.title}</span>
        <span className="mgmt-row__meta">
          <Tag tone={vm.isOpen ? "danger" : undefined}>{vm.dDay}</Tag>
          <span>{vm.companyName}</span>
        </span>
      </span>
    </Link>
  );
}
