"use client";

// 용사의 스테이터스 창(#43 · #45): SDGs 17개 항목을 게임의 스테이터스 화면처럼 — 남색 게임 창 안에 번호 순으로 한 줄씩.
// 한 줄 = 그 목표의 문장(#42) · 번호와 공식 이름 · 지금 레벨 안에서 채운 EXP 막대 · 「EXP 110」「次まで 90」 · 오른쪽에 「Lv.2」.
// EXP 는 기업의 평가 점수로 쌓여요(수상하지 않아도 — status.ts). EXP 가 가장 높은 3개는 금색 「得意」.
// 화면 읽기 프로그램에는 한 줄을 「目標14 海の豊かさを守ろう レベル2 経験値110、次のレベルまで90（得意）」로 통째로 알려요.
import type { CSSProperties } from "react";
import type { SdgStatVM } from "@sdgs-compass/core/selectors";
import { SdgEmblem } from "@/components/sdg";
import { useSession } from "@/lib/session";

export function StatsWindow({ stats }: { stats: readonly SdgStatVM[] }) {
  const { t } = useSession();
  return (
    <section className="stats" aria-labelledby="stats-title" data-testid="sdg-stats">
      <div className="stats__head">
        <h2 id="stats-title" className="stats__title">
          {t("impact.statsTitle")}
        </h2>
        <p className="stats__hint">{t("impact.statsHint")}</p>
      </div>
      <ol className="stats__list">
        {stats.map((stat) => (
          <li
            key={stat.id}
            className="stat"
            data-top={stat.top ? "true" : undefined}
            data-zero={stat.exp === 0 ? "true" : undefined}
            data-max={stat.max ? "true" : undefined}
            aria-label={stat.ariaLabel}
          >
            {/* 아이템 칸처럼 밝은 바탕 위에 문장(남색 창에서도 테두리가 보이게) */}
            <span className="stat__slot">
              <SdgEmblem id={stat.id} size={26} />
            </span>
            <span className="stat__main" aria-hidden="true">
              <span className="stat__name">
                <span className="stat__no" style={{ background: stat.color, color: stat.textColor }}>
                  {stat.id}
                </span>
                <span className="stat__label">{stat.name}</span>
                {stat.top ? <span className="stat__top">★ {t("impact.statTop")}</span> : null}
              </span>
              <span className="stat__bar" style={{ "--fill": `${stat.progress}%`, "--sdg": stat.color } as CSSProperties} />
              <span className="stat__exp">
                <span>{stat.expLabel}</span>
                <span className="stat__next">{stat.nextLabel}</span>
              </span>
            </span>
            <span className="stat__level" aria-hidden="true">
              {stat.levelLabel}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
