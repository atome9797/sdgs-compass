"use client";

// 연구 의뢰 화면들이 같이 쓰는 부품: 의뢰 카드 · 진행 단계 · 「아이디어를 형태로 만들기까지의 흐름」 · 숫자 칸 · 거래 조건
import Link from "next/link";
import type { ReactNode } from "react";
import { researchFlow, type ResearchCardVM, type ResearchDetailVM } from "@sdgs-compass/core/researchView";
import { tint } from "@sdgs-compass/core/theme";
import { labRequestHref } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { Tag } from "./ui";

/**
 * 의뢰 카드: 회사 · 상태 · 제목(연구자 화면에서는 상세로 가는 링크) · 출발점 아이디어 · 의뢰비 · 기한 · 분야.
 * 기업 화면은 linked=false — 상세 대신 카드 안(children)에 담당 연구자·성과·완료 단추를 보여 주고, 「あなたが担当」 칩은 연구자 화면에서만 보여요
 * (내 연구 화면은 모두 내 것이라 showMine=false).
 */
export function ResearchCard({ vm, linked = true, showMine = true, children }: { vm: ResearchCardVM; linked?: boolean; showMine?: boolean; children?: ReactNode }) {
  const { t } = useSession();
  return (
    <article className="card rcard">
      <div className="rcard__head">
        <span className="rcard__logo" style={{ background: tint(vm.companyAccent, 0.16), borderColor: tint(vm.companyAccent, 0.45) }} aria-hidden="true">
          {vm.companyEmoji}
        </span>
        <p className="rcard__company grow">{vm.companyName}</p>
        <Tag tone={vm.statusTone}>{vm.statusLabel}</Tag>
      </div>
      <h3 className="rcard__title">{linked ? <Link href={labRequestHref(vm.id)}>{vm.title}</Link> : vm.title}</h3>
      <p className="rcard__idea">💡 {t("research.ideaWith", { idea: vm.ideaLabel })}</p>
      <div className="rcard__facts">
        <span>
          {t("research.fee")} <span className="rcard__fee">{vm.feeLabel}</span>
        </span>
        <span>
          {t("research.due")} {vm.dueLabel}
        </span>
        {vm.dDay ? <Tag tone={vm.overdue ? "danger" : undefined}>{vm.dDay}</Tag> : null}
        {vm.mine && linked && showMine ? <Tag tone="info">{t("research.mine")}</Tag> : null}
      </div>
      <div className="chips">
        {vm.fieldLabels.map((label) => (
          <Tag key={label}>{label}</Tag>
        ))}
      </div>
      {children}
    </article>
  );
}

/** 모집 중 → 연구 중 → 확인 대기 → 완료 */
export function ResearchSteps({ vm }: { vm: ResearchDetailVM }) {
  const { t } = useSession();
  return (
    <ol className="steps" aria-label={t("research.progress")}>
      {vm.steps.map((step, i) => (
        <li key={step.status} className={step.state === "done" ? "step step--done" : step.state === "current" ? "step step--current" : "step"} aria-current={step.state === "current" ? "step" : undefined}>
          <span className="step__dot" aria-hidden="true">
            {step.state === "done" ? "✓" : i + 1}
          </span>
          {step.label}
        </li>
      ))}
    </ol>
  );
}

/**
 * 아이디어를 형태로 만들기까지의 흐름(5단계). here = 지금 화면이 맡는 단계(강조), 마지막 단계(제조·판로)는 앱 밖이라 흐리게 보여요.
 * 기업이 돈을 내는 때(상금 · 의뢰비)가 단계에 들어 있어서 「언제 무엇에 돈을 내는지」가 한눈에 보여요.
 */
export function ResearchFlow({ here }: { here: readonly number[] }) {
  const { t, locale } = useSession();
  const steps = researchFlow(locale);
  return (
    <section className="card card--pad stack stack--sm" aria-labelledby="research-flow-title">
      <h2 id="research-flow-title" className="flow-title">
        {t("research.flow.title")}
      </h2>
      <ol className="flowlist">
        {steps.map((text, i) => (
          <li key={text} className={here.includes(i + 1) ? "flowlist__here" : i === steps.length - 1 ? "flowlist__outside" : undefined}>
            {text}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 숫자 칸 묶음 (내 연구 · 기업의 연구 의뢰 맨 위) */
export function StatGrid({ items, label }: { items: readonly { id: string; label: string; value: string }[]; label: string }) {
  return (
    <div className="card card--pad">
      <dl className="stat-grid" aria-label={label}>
        {items.map((item) => (
          <div key={item.id} className="fee-split__cell">
            <dt className="fee-split__label">{item.label}</dt>
            <dd className="fee-split__value">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** 거래 조건: 의뢰비 · 기한 · 지급 · 운영 수수료(예정) — 연구자가 맡기 전에 봐요 */
export function ResearchTerms({ vm }: { vm: ResearchDetailVM }) {
  const { t } = useSession();
  return (
    <div className="stack stack--sm">
      <dl className="kv">
        {vm.terms.map((term) => (
          <div key={term.label} style={{ display: "contents" }}>
            <dt>{term.label}</dt>
            <dd>{term.value}</dd>
          </div>
        ))}
      </dl>
      <p className="small muted">{t("research.termsNote")}</p>
    </div>
  );
}

/** 도착한 성과: 요약 · 파일 · 보낸 시각 · 파일 지문 */
export function ResearchResultBox({ vm }: { vm: ResearchDetailVM }) {
  const { t } = useSession();
  if (!vm.result) return null;
  return (
    <div className="stack stack--sm">
      <p className="small">{vm.result.summary}</p>
      <dl className="kv">
        <dt>{t("research.resultFile")}</dt>
        <dd>
          📄 {vm.result.fileName} ({vm.result.fileSizeLabel})
        </dd>
        <dt>{t("research.resultAt")}</dt>
        <dd>{vm.result.submittedLabel}</dd>
      </dl>
      <p className="small muted">{t("research.fingerprint")}</p>
      <p className="hash mono">{vm.result.sha256}</p>
    </div>
  );
}
