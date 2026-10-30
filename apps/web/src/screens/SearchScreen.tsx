"use client";

// 챌린지 검색: 키워드 + SDG 칩. 모집 중인 것이 위(매칭률 순), 마감된 것은 맨 아래.
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { SdgId } from "@sdgs-compass/core/sdg";
import { selectSdgTiles, selectSearch } from "@sdgs-compass/core/selectors";
import { ChallengeCard } from "@/components/ChallengeCard";
import { SdgChips } from "@/components/sdg";
import { Button, Empty, ScreenHead } from "@/components/ui";
import { parseSdgParam } from "@/lib/routes";
import { useSession } from "@/lib/session";

function SearchView({ initialQuery, initialSdgIds }: { initialQuery: string; initialSdgIds: SdgId[] }) {
  const { demo, locale, t } = useSession();
  const [query, setQuery] = useState(initialQuery);
  const [sdgIds, setSdgIds] = useState<SdgId[]>(initialSdgIds);
  const tiles = useMemo(() => selectSdgTiles(locale), [locale]);
  const results = useMemo(() => selectSearch(demo, locale, { query, sdgIds }), [demo, locale, query, sdgIds]);
  const filtered = query.trim() !== "" || sdgIds.length > 0;
  const clear = () => {
    setQuery("");
    setSdgIds([]);
  };
  const toggle = (id: SdgId) => setSdgIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  return (
    <div className="screen">
      <ScreenHead title={t("search.title")} />
      <form role="search" className="stack" onSubmit={(event) => event.preventDefault()}>
        <label className="sr-only" htmlFor="search-q">
          {t("search.placeholder")}
        </label>
        <input id="search-q" className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search.placeholder")} enterKeyHint="search" />
        <div className="stack stack--sm">
          <p className="section__hint">{t("search.filterSdg")}</p>
          <SdgChips tiles={tiles} selected={sdgIds} onToggle={toggle} label={t("search.filterSdg")} scroll />
        </div>
      </form>

      <div className="row row--between">
        <p className="strong" role="status">
          {t("search.results", { count: results.length })}
        </p>
        {filtered ? (
          <Button size="sm" variant="ghost" onClick={clear}>
            {t("search.clear")}
          </Button>
        ) : null}
      </div>
      <p className="section__hint">{t("search.sortNote")}</p>

      {results.length === 0 ? (
        <Empty>{t("search.empty")}</Empty>
      ) : (
        <div className="card-list">
          {results.map((card) => (
            <ChallengeCard key={card.id} vm={card} showReasons={false} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchScreen() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const sdg = params.get("sdg") ?? "";
  // 주소의 조건이 바뀌면(홈의 SDG 타일 등) 입력 상태도 새로 시작해요
  return <SearchView key={`${q}|${sdg}`} initialQuery={q} initialSdgIds={parseSdgParam(sdg)} />;
}
