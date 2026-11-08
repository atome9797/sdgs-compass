"use client";

// 기업 네트워크 /b2b/network/: 우리 회사의 신뢰 실적 · 탭(기업 찾기 · 공개 모집 · 주고받기)
// 찾기: 할 수 있는 일로 거르기(?category=) · 정렬(?sort=deals) · 검색(?q=) — 주소에 남아서 새로고침해도 그대로예요. 신뢰 기업이 아닌 기업은 아래에 이유와 함께.
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import { parseNetworkSort, parseNetworkTab, parseWorkCategory, selectNetworkHome, type NetworkHomeVM } from "@sdgs-compass/core/networkView";
import { CompanyCard, Logo, RequestsHub, TrustLine, WorkCard } from "@/components/Network";
import { Banner, ButtonLink, Empty, Field, ScreenHead, Section, Tag } from "@/components/ui";
import { networkHref, networkNewHref } from "@/lib/routes";
import { useSession } from "@/lib/session";

function FindTab({ vm }: { vm: NetworkHomeVM }) {
  const { t } = useSession();
  const router = useRouter();
  const go = (patch: { category?: string | null; sort?: string; q?: string }) =>
    router.replace(networkHref({ tab: "find", category: patch.category !== undefined ? patch.category : vm.category, sort: patch.sort ?? vm.sort, q: patch.q !== undefined ? patch.q : vm.query }));
  return (
    <div className="stack">
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div className="grow" style={{ minWidth: 220 }}>
          <Field label={t("network.search")}>
            {(props) => <input {...props} className="input" type="search" defaultValue={vm.query} onChange={(event) => go({ q: event.target.value })} />}
          </Field>
        </div>
        <div style={{ minWidth: 180 }}>
          <Field label={t("network.sort.label")}>
            {(props) => (
              <select {...props} className="select" value={vm.sort} onChange={(event) => go({ sort: event.target.value })}>
                {vm.sorts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </div>
      <div className="chips" role="group" aria-label={t("network.filter.label")}>
        {vm.categories.map((c) => (
          <button key={c.id ?? "all"} type="button" className="chip" aria-pressed={vm.category === c.id} onClick={() => go({ category: c.id })}>
            {c.label} <span className="chip__count">{c.count}</span>
          </button>
        ))}
      </div>
      <p className="small muted" aria-live="polite">
        {vm.foundLabel}
      </p>
      {vm.companies.length === 0 ? (
        <Empty>{t("network.empty")}</Empty>
      ) : (
        <ul className="card-list card-list--grid">
          {vm.companies.map((c) => (
            <li key={c.id}>
              <CompanyCard vm={c} />
            </li>
          ))}
        </ul>
      )}
      {vm.notYet.length > 0 ? (
        <Section title={t("network.notYetTitle")} hint={t("network.notYetHint")}>
          <ul className="card-list">
            {vm.notYet.map((c) => (
              <li key={c.id} className="card rcard">
                <div className="rcard__head">
                  <Logo emoji={c.emoji} accent={c.accent} size={32} />
                  <p className="strong grow">{c.name}</p>
                  <Tag>{t("network.notTrusted")}</Tag>
                </div>
                <p className="small muted">{c.reasons}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function OpenTab({ vm }: { vm: NetworkHomeVM }) {
  const { t } = useSession();
  return (
    <div className="stack">
      <div className="row row--between">
        <p className="small muted grow">{t("network.open.intro")}</p>
        {vm.canPost ? (
          <ButtonLink href={networkNewHref({ mode: "open" })} size="sm" variant="secondary">
            ＋ {t("network.open.post")}
          </ButtonLink>
        ) : null}
      </div>
      {vm.openRequests.length === 0 ? (
        <Empty>{t("network.open.empty")}</Empty>
      ) : (
        <ul className="card-list card-list--grid">
          {vm.openRequests.map((w) => (
            <li key={w.id}>
              <WorkCard vm={w} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MineTab({ vm }: { vm: NetworkHomeVM }) {
  const { t } = useSession();
  return (
    <div className="stack">
      {vm.todoCount > 0 ? (
        <Banner tone="warning" icon="📌">
          {t("network.todo", { count: vm.todoCount })}
        </Banner>
      ) : null}
      {vm.groups.map((g) => (
        <Section key={g.id} title={g.title} action={<Tag>{g.items.length}</Tag>}>
          {g.items.length === 0 ? (
            <Empty>{t("network.mine.empty")}</Empty>
          ) : (
            <ul className="card-list">
              {g.items.map((w) => (
                <li key={w.id}>
                  <WorkCard vm={w} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      ))}
    </div>
  );
}

export function NetworkHomeScreen() {
  const { demo, locale, t } = useSession();
  const params = useSearchParams();
  const tab = parseNetworkTab(params.get("tab"));
  const category = parseWorkCategory(params.get("category"));
  const sort = parseNetworkSort(params.get("sort"));
  const query = params.get("q") ?? "";
  const vm = useMemo(() => selectNetworkHome(demo, locale, { tab, category, sort, query }), [demo, locale, tab, category, sort, query]);
  return (
    <div className="screen">
      <ScreenHead title={t("network.title")} />
      <RequestsHub current="network" />
      <p className="small muted">{t("network.intro")}</p>

      <section className="card card--pad stack stack--sm" aria-label={t("network.us")}>
        <div className="rcard__head">
          <Logo emoji={vm.us.emoji} accent={vm.us.accent} />
          <div className="grow">
            <p className="small muted">{t("network.us")}</p>
            <p className="strong">{vm.us.name}</p>
          </div>
        </div>
        <TrustLine trust={vm.us.trust} long />
        <p className="small">{vm.usText}</p>
        <p className="small muted">{vm.rule}</p>
        <p className="small muted">🎁 {t("network.feeFree")}</p>
      </section>

      <nav className="chips" aria-label={t("network.tabsLabel")}>
        {vm.tabs.map((item) => (
          <Link key={item.id} className="chip" href={networkHref({ tab: item.id })} aria-current={vm.tab === item.id ? "page" : undefined}>
            {item.label} <span className="chip__count">{item.count}</span>
          </Link>
        ))}
      </nav>

      {vm.tab === "find" ? <FindTab vm={vm} /> : vm.tab === "open" ? <OpenTab vm={vm} /> : <MineTab vm={vm} />}
    </div>
  );
}
