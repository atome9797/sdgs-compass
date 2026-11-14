"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { sdgEmblem } from "@sdgs-compass/core/emblems";
import { sdgLabel } from "@sdgs-compass/core/labels";
import { pngDataUri } from "@sdgs-compass/core/png";
import { getSdg, sdgTextColor, type SdgId } from "@sdgs-compass/core/sdg";
import type { SdgCountTileVM, SdgTileVM } from "@sdgs-compass/core/selectors";
import { SDG_TILE_TINT, tint } from "@sdgs-compass/core/theme";
import { searchHref } from "@/lib/routes";
import { useSession } from "@/lib/session";

const emblemUris = new Map<SdgId, string>();
/** 문장(#42)의 PNG 데이터 URI — 목표마다 한 번만 만들어요(4배로 미리 키워서 칸이 번지지 않게) */
export function emblemUri(id: SdgId): string {
  const hit = emblemUris.get(id);
  if (hit) return hit;
  const uri = pngDataUri(sdgEmblem(id), 4);
  emblemUris.set(id, uri);
  return uri;
}

/** SDG 목표의 스킬 문장(#42): 이 앱이 그린 16×16 픽셀 그림(공식 아이콘이 아니에요). label 이 없으면 장식(화면 읽기 프로그램은 건너뛰어요) */
export function SdgEmblem({ id, size = 24, label }: { id: SdgId; size?: number; label?: string }) {
  const style = { width: size, height: size, backgroundImage: `url("${emblemUri(id)}")` } as CSSProperties;
  return label ? <span className="emblem" role="img" aria-label={label} style={style} /> : <span className="emblem" aria-hidden="true" style={style} />;
}

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

/**
 * 홈의 17개 목표 타일 (#29): 큰 숫자 = 그 목표가 붙은 모집 중 과제 수 + 작은 단위, 목표 번호는 이름 위에 작게.
 * 0건은 옅게 보여도 누를 수 있어요. 누르면 그 목표로 걸러진 검색 화면으로 가요(검색 결과의 모집 중 수와 같은 숫자예요).
 */
export function SdgTileGrid({ tiles }: { tiles: readonly SdgCountTileVM[] }) {
  return (
    <div className="sdg-grid">
      {tiles.map((tile) => {
        const zero = tile.openCount === 0;
        // 0건 타일은 바탕·띠를 더 옅게 하고 글자는 textMuted — 흐려 보여도 대비(4.5:1 이상)는 지켜요(투명도는 쓰지 않아요)
        const style = { "--sdg": zero ? tint(tile.color, SDG_TILE_TINT.zeroBar) : tile.color, background: tint(tile.color, zero ? SDG_TILE_TINT.zero : SDG_TILE_TINT.base) } as CSSProperties;
        return (
          <Link key={tile.id} href={searchHref({ sdgIds: [tile.id] })} className={zero ? "sdg-tile sdg-tile--zero" : "sdg-tile"} style={style} aria-label={tile.label} title={tile.label}>
            <span className="sdg-tile__count">
              {tile.openCount}
              <span className="sdg-tile__unit">{tile.unit}</span>
            </span>
            {/* 오른쪽 위에 그 목표의 스킬 문장(#42) */}
            <SdgEmblem id={tile.id} size={26} />
            <span className="sdg-tile__label">
              <span className="sdg-tile__goal">{tile.id}</span>
              <span className="sdg-tile__name">{tile.short}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * SDG 선택 칩 (필터·출제 화면). max 가 있으면 그만큼만 고를 수 있어요. scroll 이면 한 줄로 가로 스크롤.
 * 개수가 붙은 칩(SdgCountTileVM — 검색 화면)이면 이름 뒤에 모집 중 과제 수를 작게 보여 줘요(#29). 고르는 화면의 칩에는 숫자가 없어요.
 */
export function SdgChips({ tiles, selected, onToggle, label, max, scroll = false }: { tiles: readonly (SdgTileVM | SdgCountTileVM)[]; selected: readonly SdgId[]; onToggle: (id: SdgId) => void; label: string; max?: number; scroll?: boolean }) {
  return (
    <div className={scroll ? "hscroll" : "chips"} role="group" aria-label={label}>
      {tiles.map((tile) => {
        const on = selected.includes(tile.id);
        const blocked = max !== undefined && !on && selected.length >= max;
        const counted = "openCount" in tile;
        return (
          <button key={tile.id} type="button" className="chip" aria-pressed={on} disabled={blocked} onClick={() => onToggle(tile.id)} title={counted ? tile.label : tile.name} aria-label={counted ? tile.label : undefined}>
            <span className="chip__dot" style={{ background: tile.color }} aria-hidden="true" />
            {tile.id} {tile.short}
            {counted ? <span className="chip__count">{tile.openCount}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
