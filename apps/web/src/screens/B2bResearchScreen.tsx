"use client";

// 기업의 연구 의뢰 /b2b/research/: 아이디어를 형태로 만들기까지의 흐름(③ 강조) · 기업이 돈을 내는 때 · 숫자 · 우리 회사의 의뢰 목록
// 확인 대기(성과 도착) → 「成果を確認して完了にする」(확인 한 번 더) → 완료 · 의뢰비는 연구자에게 직접 지급(데모는 기록만)
// ?posted=<id> 로 오면 방금 게재한 의뢰를 알려 줘요.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { researchPayTimings, selectB2bResearch, type ResearchDetailVM } from "@sdgs-compass/core/researchView";
import { ALL_CHALLENGES } from "@sdgs-compass/core/selectors";
import { ResearchCard, ResearchFlow, ResearchResultBox, StatGrid } from "@/components/Research";
import { Banner, Button, ButtonLink, Card, Empty, ScreenHead, Section } from "@/components/ui";
import { applicantsHref, researchNewHref } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { nowIso } from "@/lib/time";

function RequestRow({ vm, highlight }: { vm: ResearchDetailVM; highlight: boolean }) {
  const { t, dispatch } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <li className={highlight ? "rrow rrow--new" : "rrow"}>
      <ResearchCard vm={vm} linked={false}>
        {vm.researcherLabel ? <p className="small">🔬 {t("research.researcherWith", { name: vm.researcherLabel })}</p> : null}
        {vm.status === "open" ? <p className="small muted">{t("research.b2b.waitingResearcher")}</p> : null}
        {vm.status === "inProgress" ? <p className="small muted">{t("research.b2b.researching")}</p> : null}
        {vm.result ? (
          <details className="rrow__result" open={vm.status === "delivered"}>
            <summary className="strong">📦 {t("research.result")}</summary>
            <ResearchResultBox vm={vm} />
          </details>
        ) : null}
        {vm.canComplete ? (
          confirming ? (
            <div className="stack">
              <Banner tone="info" icon="💴">
                {t("research.b2b.completeConfirm", { fee: vm.feeLabel, platformFee: vm.platformFeeLabel })}
              </Banner>
              <div className="row">
                <Button
                  onClick={() => {
                    dispatch({ type: "completeResearchRequest", requestId: vm.id, at: nowIso() });
                    setConfirming(false);
                    setDone(true);
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
              <Button onClick={() => setConfirming(true)}>✅ {t("research.b2b.complete")}</Button>
            </div>
          )
        ) : null}
        <div className="live" aria-live="polite">
          {done && vm.status === "completed" ? <Banner tone="success">{t("research.b2b.completed", { fee: vm.feeLabel, platformFee: vm.platformFeeLabel })}</Banner> : null}
        </div>
      </ResearchCard>
    </li>
  );
}

export function B2bResearchScreen() {
  const { demo, locale, t } = useSession();
  const posted = useSearchParams().get("posted");
  const vm = useMemo(() => selectB2bResearch(demo, locale), [demo, locale]);
  const pay = useMemo(() => researchPayTimings(locale), [locale]);
  const justPosted = posted ? vm.requests.find((r) => r.id === posted) : undefined;
  return (
    <>
      <ScreenHead
        title={t("research.b2b.title")}
        side={
          vm.canCreate ? (
            <ButtonLink href={researchNewHref()} size="sm">
              ＋ {t("research.b2b.new")}
            </ButtonLink>
          ) : null
        }
      />
      <p className="small muted">{t("research.b2b.intro")}</p>
      {justPosted ? (
        <div className="live" aria-live="polite">
          <Banner tone="success">{t("research.b2b.posted")}</Banner>
        </div>
      ) : null}

      <div className="research-top">
        <ResearchFlow here={[3]} />
        <Card className="stack stack--sm">
          <h2 className="flow-title">💴 {t("research.pay.title")}</h2>
          <ol className="flowlist">
            {pay.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <p className="small muted">{pay.note}</p>
        </Card>
      </div>

      <StatGrid items={vm.kpis} label={t("research.b2b.title")} />
      <p className="small muted">{vm.feeNote}</p>

      {!vm.canCreate ? (
        <Banner tone="info">
          {t("research.b2b.noIdeas")}{" "}
          <Link href={applicantsHref(ALL_CHALLENGES, "all")}>{t("b2b.viewApplicants")} ›</Link>
        </Banner>
      ) : null}

      <Section title={t("research.b2b.title")}>
        {vm.requests.length === 0 ? (
          <Empty>{vm.emptyLabel}</Empty>
        ) : (
          <ul className="card-list research-list">
            {vm.requests.map((request) => (
              <RequestRow key={request.id} vm={request} highlight={request.id === posted} />
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
