"use client";

// SCR-05 SNS 카드뉴스: 성과 한 건을 Instagram(1:1)·LinkedIn(1.91:1) 카드로 → 복사·공유·앱 내 저장
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { MAX_SHARE_ACTIVITIES } from "@sdgs-compass/core/impact";
import type { CardTemplate } from "@sdgs-compass/core/shareCard";
import { selectShare } from "@sdgs-compass/core/selectors";
import { ShareCardPreview } from "@/components/ShareCardPreview";
import { Banner, Button, ButtonLink, Empty, Field, ScreenHead, Tag } from "@/components/ui";
import { browserClipboardEnv, browserShareEnv, copyText, shareOrCopy } from "@/lib/clipboard";
import { buildHref, postNewHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";

type Notice = { tone: "success" | "danger" | "info"; text: string } | null;

/** 화면 미리보기·테스트용 */
export interface SharePreset {
  template?: CardTemplate;
  activityId?: string | null;
}

export function ShareScreen({ preset }: { preset?: SharePreset }) {
  const { demo, locale, t, dispatch } = useSession();
  // 피드의 "카드뉴스로 만들기"에서 오면 주소의 activity 로 그 실적을 미리 골라 둬요
  const requestedActivity = useSearchParams().get("activity");
  const [template, setTemplate] = useState<CardTemplate>(preset?.template ?? "instagram");
  const [activityId, setActivityId] = useState<string | null>(preset?.activityId ?? requestedActivity);
  const [notice, setNotice] = useState<Notice>(null);
  const vm = useMemo(() => selectShare(demo, locale, template, activityId), [demo, locale, template, activityId]);
  const card = vm.card;

  const templates: { id: CardTemplate; label: string }[] = [
    { id: "instagram", label: t("share.templateInstagram") },
    { id: "linkedin", label: t("share.templateLinkedin") },
  ];

  const copy = async () => {
    if (!card) return;
    const result = await copyText(card.caption, browserClipboardEnv());
    setNotice(result === "failed" ? { tone: "danger", text: t("web.share.copyFail") } : { tone: "success", text: t("web.share.copyDone") });
  };
  const share = async () => {
    if (!card) return;
    const result = await shareOrCopy({ title: card.headline, text: card.caption }, browserShareEnv());
    if (result === "shared") setNotice({ tone: "success", text: t("web.share.shared") });
    else if (result === "copied") setNotice({ tone: "info", text: t("share.copied") });
    else if (result === "failed") setNotice({ tone: "danger", text: t("web.share.copyFail") });
    else setNotice(null);
  };
  const save = () => {
    // 발신 실적은 MAX_SHARE_ACTIVITIES 회까지만 쌓여요 (core/impact.ts) — 숫자(포인트)는 보여 주지 않아요
    const recorded = demo.shares < MAX_SHARE_ACTIVITIES;
    dispatch({ type: "recordShare" });
    setNotice({ tone: "success", text: recorded ? t("share.saved") : t("share.savedMax", { max: MAX_SHARE_ACTIVITIES }) });
  };

  return (
    <div className="screen">
      <ScreenHead title={t("share.title")} back={buildHref(ROUTES.impact)} backLabel={t("common.back")} />

      {!card ? (
        <Empty>{t("share.noActivity")}</Empty>
      ) : (
        <>
          <div className="chips" role="radiogroup" aria-label={t("share.title")}>
            {templates.map((item) => (
              <button key={item.id} type="button" role="radio" aria-checked={template === item.id} className="chip" onClick={() => setTemplate(item.id)}>
                {item.label}
              </button>
            ))}
          </div>

          <Field label={t("share.pickActivity")}>
            {(props) => (
              <select {...props} className="select" value={vm.selectedId ?? ""} onChange={(event) => setActivityId(event.target.value)}>
                {vm.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <ShareCardPreview card={card} brand={t("app.name")} demoLabel={t("app.demoBadge")} />

          <section className="stack stack--sm" aria-label={t("web.share.caption")}>
            <p className="field__label">{t("web.share.caption")}</p>
            <p className="caption">{card.caption}</p>
            <div className="chips">
              {card.hashtags.split(" ").map((tag) => (
                <Tag key={tag} tone="info">
                  {tag}
                </Tag>
              ))}
            </div>
          </section>

          <div className="live" aria-live="polite">
            {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
          </div>
          <div className="stack">
            <Button onClick={share}>📤 {t("share.send")}</Button>
            <div className="row">
              <Button variant="secondary" className="grow" onClick={copy}>
                📋 {t("web.share.copy")}
              </Button>
              <Button variant="secondary" className="grow" onClick={save}>
                💾 {t("share.saveInApp")}
              </Button>
            </div>
            {/* 같은 실적을 앱 안 SNS 피드(F-503)에도 올려요 — 글쓰기 화면이 이 실적을 미리 골라 둬요 */}
            <ButtonLink href={postNewHref("b2c", vm.selectedId)} variant="secondary" block>
              💬 {t("share.postToFeed")}
            </ButtonLink>
          </div>
          <p className="small muted">🔒 {t("share.privacy")}</p>
        </>
      )}
    </div>
  );
}
