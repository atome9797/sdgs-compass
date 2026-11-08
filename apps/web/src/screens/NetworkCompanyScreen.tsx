"use client";

// 기업 프로필 /b2b/network/company/?id=: 신뢰 실적(이 앱에서 약속대로 지급한 거래 · 지급 지연) · 할 수 있는 일 · 받은 평가 · 「この企業に依頼する」
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { selectNetworkProfile } from "@sdgs-compass/core/networkView";
import { Logo, RatingItem, TrustLine } from "@/components/Network";
import { ButtonLink, Empty, ScreenHead, Section, Tag } from "@/components/ui";
import { buildHref, networkNewHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";

export function NetworkCompanyScreen() {
  const { demo, locale, t } = useSession();
  const id = useSearchParams().get("id");
  const vm = useMemo(() => selectNetworkProfile(demo, id, locale), [demo, id, locale]);
  const back = buildHref(ROUTES.b2bNetwork);
  if (!vm) {
    return (
      <div className="screen">
        <ScreenHead title={t("network.title")} back={back} backLabel={t("network.backToList")} />
        <Empty>{t("network.empty")}</Empty>
      </div>
    );
  }
  const c = vm.company;
  return (
    <div className="screen">
      <ScreenHead title={c.name} back={back} backLabel={t("network.backToList")} />

      <section className="card card--pad stack stack--sm">
        <div className="rcard__head">
          <Logo emoji={c.emoji} accent={c.accent} size={48} />
          <div className="grow">
            <p className="strong">{c.name}</p>
            <p className="small muted">
              {c.region} · {c.industry}
            </p>
          </div>
        </div>
        <TrustLine trust={c.trust} long />
        {c.trust.missingLabels.length > 0 ? <p className="small muted">{c.trust.missingLabels.join(locale === "ja" ? "・" : " · ")}</p> : null}
        <p className="small">{c.about}</p>
        <div className="chips" aria-label={t("network.filter.label")}>
          {c.offers.map((o) => (
            <Tag key={o.id} tone="info">
              {o.label}
            </Tag>
          ))}
        </div>
        {c.offerNote ? <p className="ncard__offer">{c.offerNote}</p> : null}
        {c.isUs ? <p className="small muted">{t("network.isUs")}</p> : null}
        {c.canRequest ? (
          <div>
            <ButtonLink href={networkNewHref({ to: c.id })}>
              <span aria-hidden="true">🤝</span> {t("network.request")}
            </ButtonLink>
          </div>
        ) : null}
      </section>

      <Section title={t("network.record.title")} hint={t("network.record.note")}>
        <div className="card card--pad">
          <dl className="kv">
            {vm.record.map((r) => (
              <div key={r.label} style={{ display: "contents" }}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section title={t("rating.list")} action={<Tag>{vm.ratings.length}</Tag>}>
        {vm.ratings.length === 0 ? (
          <Empty>{t("rating.listEmpty")}</Empty>
        ) : (
          <ul className="card-list">
            {vm.ratings.map((r) => (
              <li key={r.id}>
                <RatingItem vm={r} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
