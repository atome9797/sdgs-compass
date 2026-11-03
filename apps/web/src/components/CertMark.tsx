"use client";

// SDGs 실천 마크(#35): 별 그림(가득·반·빈) · 회사 이름 옆의 마크 단추 · 누르면 보이는 안내(독자 기준 + 기준 한 줄).
// 값은 모두 core 의 CertMarkVM/EsgVM 이고, 여기서는 그리기만 해요. 별 그림은 늘 마크 이름·숫자와 함께 써서 사용자 평점으로 읽히지 않게 하고,
// 스크린 리더에는 숫자가 들어간 이름(「SDGs取組みマーク 5段階中4.5」)만 읽혀요(그림은 aria-hidden).
import { useId, useState } from "react";
import { formatStars, type StarIcon } from "@sdgs-compass/core/certification";
import type { CertMarkVM } from "@sdgs-compass/core/selectors";

/** 별 하나 (24×24 의 다섯 꼭짓점 별). 빈 별은 옅은 바탕 + 금색 테두리, 반 별은 왼쪽 절반만 칠해요 */
const STAR_PATH = "M12 2.6l2.83 5.94 6.52.83-4.79 4.5 1.22 6.46L12 17.2l-5.78 3.13 1.22-6.46-4.79-4.5 6.52-.83z";

function Star({ kind }: { kind: StarIcon }) {
  return (
    <span className={`star star--${kind}`}>
      <svg viewBox="0 0 24 24" className="star__base" focusable="false">
        <path d={STAR_PATH} />
      </svg>
      {kind === "empty" ? null : (
        <span className="star__fill">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d={STAR_PATH} />
          </svg>
        </span>
      )}
    </span>
  );
}

/** 별 그림 5칸. 그림은 읽히지 않고(aria-hidden), 뜻은 옆의 숫자와 감싼 요소의 이름이 전해요 */
export function StarRow({ icons, size = "md" }: { icons: readonly StarIcon[]; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`stars stars--${size}`} aria-hidden="true">
      {icons.map((kind, i) => (
        <Star key={i} kind={kind} />
      ))}
    </span>
  );
}

/** 마크의 자세한 안내: 별 그림 + 이름 + 숫자, 독자 기준이라는 안내, 기준 한 줄 (챌린지 상세의 기업 칸은 늘 펼쳐서 보여 줘요) */
export function CertMarkDetail({ mark }: { mark: CertMarkVM }) {
  return (
    <div className="cmark-detail">
      <p className="cmark-detail__head" role="img" aria-label={mark.accessibilityLabel}>
        <StarRow icons={mark.icons} size="sm" />
        <span className="cmark-detail__name">{mark.name}</span>
        <span className="cmark-detail__num">{mark.starsLabel}</span>
      </p>
      <p className="cmark-detail__text">{mark.disclaimer}</p>
      <p className="cmark-detail__text">{mark.rule}</p>
    </div>
  );
}

/** 마크 단추를 누르면 펼쳐지는 안내 칸의 상태 (단추와 안내 칸이 화면의 다른 자리에 있을 때 둘을 잇는 id 와 함께) */
export function useMarkDisclosure() {
  const noteId = useId();
  const [open, setOpen] = useState(false);
  return { noteId, open, toggle: () => setOpen((value) => !value) };
}

/**
 * 회사 이름 옆의 마크 단추: 「SDGs取組みマーク ★4.5 ?」. 누르면 안내 칸(CertMarkNote)이 열리고 닫혀요.
 * 누르는 곳은 44px 이상이지만 위아래 여백을 겹쳐 둬서 줄 높이는 작아요.
 */
export function CertMarkButton({ mark, open, noteId, onToggle }: { mark: CertMarkVM; open: boolean; noteId: string; onToggle: () => void }) {
  return (
    <button type="button" className="cmark" aria-label={mark.accessibilityLabel} aria-expanded={open} aria-controls={noteId} onClick={onToggle}>
      <span className="cmark__pill">
        <span className="cmark__name">{mark.name}</span>
        <span className="cmark__star">★</span>
        <span className="cmark__num">{formatStars(mark.stars)}</span>
        <span className="cmark__help">?</span>
      </span>
    </button>
  );
}

/** 마크 단추가 여는 안내 칸 (닫혀 있을 때도 자리만 두고 숨겨요 — aria-controls 가 늘 가리킬 수 있게) */
export function CertMarkNote({ mark, open, noteId }: { mark: CertMarkVM; open: boolean; noteId: string }) {
  return (
    <div id={noteId} className="cmark-note" hidden={!open}>
      <CertMarkDetail mark={mark} />
    </div>
  );
}
