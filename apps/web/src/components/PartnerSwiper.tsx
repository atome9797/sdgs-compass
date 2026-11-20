"use client";

// 첫 화면(SCR-01)의 협력 단체 배너 — Swiper 처럼 저절로 넘어가는 광고 배너.
// · 5초마다 다음 장으로 미끄러지고, 마지막 다음은 첫 장으로 같은 방향으로 이어져요(앞뒤 복사본, lib/carousel).
// · 손가락·마우스로 끌어서 넘길 수 있고, 아래 점을 누르면 그 장으로 가요.
// · 마우스를 올리거나 안에 초점이 있으면 잠시 멈추고, 멈춤 단추로 계속 멈출 수 있어요(WCAG 2.2.2).
// · 움직임 줄이기(prefers-reduced-motion)면 저절로 넘기지 않고, 미끄러지는 움직임도 없어요.
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { PartnerBannerVM } from "@sdgs-compass/core/selectors";
import { SdgMiniRow } from "@/components/sdg";
import { AUTOPLAY_MS, loopJump, positionOf, realIndex, settlePosition, SLIDE_MS, startPosition, TAP_SLOP_PX, trackItems } from "@/lib/carousel";
import { searchHref } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface Drag {
  id: number;
  x: number;
  moved: boolean;
}

export function PartnerSwiper({ slides }: { slides: readonly PartnerBannerVM[] }) {
  const { t } = useSession();
  const reduced = useReducedMotion();
  const count = slides.length;
  const items = trackItems(slides);
  const [position, setPosition] = useState(() => startPosition(count));
  const [animate, setAnimate] = useState(true);
  const [dragPx, setDragPx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const current = realIndex(position, count);
  const autoplay = playing && !reduced && !hovered && !focused && !dragging && !pageHidden && count > 1;

  // 저절로 넘기기: 위치가 바뀔 때마다 다음 타이머를 다시 걸어요
  useEffect(() => {
    if (!autoplay) return;
    const id = window.setTimeout(() => {
      setAnimate(true);
      setPosition((p) => p + 1);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [autoplay, position]);

  // 복사본 칸에 닿으면, 미끄러짐이 끝난 뒤 같은 그림의 진짜 칸으로 움직임 없이 옮겨요
  useEffect(() => {
    const jump = loopJump(position, count);
    if (jump === null) return;
    const id = window.setTimeout(() => {
      setAnimate(false);
      setPosition(jump);
    }, reduced ? 0 : SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [position, count, reduced]);

  // 옮긴 모습이 그려진 다음 프레임에 미끄러짐을 다시 켜요
  useEffect(() => {
    if (animate) return;
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setAnimate(true));
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, [animate]);

  // 다른 탭으로 가 있는 동안은 넘기지 않아요
  useEffect(() => {
    const onVisibility = () => setPageHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const goTo = (next: number) => {
    setAnimate(true);
    setPosition(next);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    suppressClick.current = false;
    if (count < 2 || (event.pointerType === "mouse" && event.button !== 0)) return;
    drag.current = { id: event.pointerId, x: event.clientX, moved: false };
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x;
    if (!d.moved && Math.abs(dx) > TAP_SLOP_PX) {
      d.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (d.moved) setDragPx(dx);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    setDragPx(0);
    if (!d.moved) return;
    suppressClick.current = true;
    const width = viewportRef.current?.clientWidth ?? 0;
    goTo(settlePosition(position, cancelled ? 0 : event.clientX - d.x, width, count));
  };

  // 끌어서 넘긴 뒤에는 그 자리의 링크가 눌리지 않게 해요
  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const trackClass = animate && !dragging ? "partner-swiper__track partner-swiper__track--animate" : "partner-swiper__track";

  return (
    <div
      className="partner-swiper"
      role="region"
      aria-roledescription="carousel"
      aria-label={t("home.partnersRegion")}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovered(false);
      }}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div
        ref={viewportRef}
        className="partner-swiper__viewport"
        aria-live={autoplay ? "off" : "polite"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => endDrag(event, false)}
        onPointerCancel={(event) => endDrag(event, true)}
        onClickCapture={onClickCapture}
      >
        <div className={trackClass} style={{ transform: `translateX(calc(${-position * 100}% + ${dragPx}px))` }}>
          {items.map((entry, i) => (
            <PartnerSlide
              key={`${entry.item.id}-${i}`}
              slide={entry.item}
              clone={entry.clone}
              label={t("home.partnersSlide", { index: entry.index + 1, count })}
              sampleLabel={t("home.partnersSample")}
              ctaLabel={t("home.partnersCta")}
              siteLabel={t("home.partnersSite")}
              newTabLabel={t("web.newTab")}
            />
          ))}
        </div>
      </div>
      {count > 1 ? (
        <div className="partner-swiper__controls">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              className="partner-swiper__dot"
              aria-label={t("home.partnersGo", { index: i + 1 })}
              aria-current={i === current ? "true" : undefined}
              onClick={() => goTo(positionOf(i, count))}
            />
          ))}
          {reduced ? null : (
            <button type="button" className="partner-swiper__toggle" aria-label={playing ? t("home.partnersPause") : t("home.partnersPlay")} onClick={() => setPlaying((v) => !v)}>
              <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

interface PartnerSlideProps {
  slide: PartnerBannerVM;
  clone: boolean;
  label: string;
  sampleLabel: string;
  ctaLabel: string;
  siteLabel: string;
  newTabLabel: string;
}

// 단추: 웹사이트가 있는 실제 단체는 그 단체의 페이지(새 탭), 샘플 단체는 같은 SDGs 목표의 퀘스트 검색
function PartnerSlide({ slide, clone, label, sampleLabel, ctaLabel, siteLabel, newTabLabel }: PartnerSlideProps) {
  const style = { "--partner-accent": slide.accent } as CSSProperties;
  return (
    <article className="partner-slide" style={style} role="group" aria-roledescription="slide" aria-label={label} aria-hidden={clone || undefined} inert={clone || undefined}>
      <div className="partner-slide__art" aria-hidden="true">
        {slide.emoji}
      </div>
      <div className="partner-slide__main">
        <p className="partner-slide__meta">
          <span className="partner-slide__name">{slide.name}</span>
          {slide.sample ? <span className="partner-slide__chip">{sampleLabel}</span> : null}
        </p>
        <p className="partner-slide__kind">{slide.kind}</p>
        <p className="partner-slide__headline">{slide.headline}</p>
        <p className="partner-slide__body">{slide.body}</p>
        <div className="partner-slide__foot">
          <SdgMiniRow ids={slide.sdgIds} />
          {slide.url ? (
            <a className="partner-slide__cta" href={slide.url} target="_blank" rel="noopener noreferrer" draggable={false}>
              {siteLabel}
              <span aria-hidden="true">&nbsp;↗</span>
              <span className="sr-only">{newTabLabel}</span>
            </a>
          ) : (
            <Link className="partner-slide__cta" href={searchHref({ sdgIds: slide.sdgIds })} draggable={false}>
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
