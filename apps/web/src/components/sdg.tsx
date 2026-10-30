"use client";

import Link from "next/link";
import { sdgLabel } from "@sdgs-compass/core/labels";
import { getSdg, sdgTextColor, type SdgId } from "@sdgs-compass/core/sdg";
import type { SdgTileVM } from "@sdgs-compass/core/selectors";
import { searchHref } from "@/lib/routes";
import { useSession } from "@/lib/session";

/** 번호가 들어간 작은 색 타일 (공식 로고 이미지는 쓰지 않아요) */
export function SdgMini({ id }: { id: SdgId }) {
  const { locale } = useSession();
  return (
    <span className="sdg-mini" style={{ background: getSdg(id).color, color: sdgTextColor(id) }} title={sdgLabel(id, locale)}>
      {id}
    </span>
  );
}

export function SdgMiniRow({ ids }: { ids: readonly SdgId[] }) {
  return (
    <span className="sdg-mini-row">
      {ids.map((id) => (
        <SdgMini key={id} id={id} />
      ))}
    </span>
  );
}

/** 홈의 17개 목표 타일: 누르면 그 목표로 걸러진 검색 화면으로 가요 */
export function SdgTileGrid({ tiles }: { tiles: readonly SdgTileVM[] }) {
  const { locale } = useSession();
  return (
    <div className="sdg-grid">
      {tiles.map((tile) => (
        <Link key={tile.id} href={searchHref({ sdgIds: [tile.id] })} className="sdg-tile" style={{ background: tile.color, color: tile.textColor }} title={sdgLabel(tile.id, locale)}>
          <span className="sdg-tile__no">{tile.id}</span>
          <span className="sdg-tile__name">{tile.short}</span>
        </Link>
      ))}
    </div>
  );
}

/** SDG 선택 칩 (필터·출제 화면). max 가 있으면 그만큼만 고를 수 있어요. scroll 이면 한 줄로 가로 스크롤 */
export function SdgChips({ tiles, selected, onToggle, label, max, scroll = false }: { tiles: readonly SdgTileVM[]; selected: readonly SdgId[]; onToggle: (id: SdgId) => void; label: string; max?: number; scroll?: boolean }) {
  return (
    <div className={scroll ? "hscroll" : "chips"} role="group" aria-label={label}>
      {tiles.map((tile) => {
        const on = selected.includes(tile.id);
        const blocked = max !== undefined && !on && selected.length >= max;
        return (
          <button key={tile.id} type="button" className="chip" aria-pressed={on} disabled={blocked} onClick={() => onToggle(tile.id)} title={tile.name}>
            <span className="chip__dot" style={{ background: tile.color }} aria-hidden="true" />
            {tile.id} {tile.short}
          </button>
        );
      })}
    </div>
  );
}
