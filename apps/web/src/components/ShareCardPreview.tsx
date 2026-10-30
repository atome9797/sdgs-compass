import type { ShareCard } from "@sdgs-compass/core/shareCard";
import { getSdg, sdgTextColor } from "@sdgs-compass/core/sdg";

/** SNS 카드뉴스 미리보기. 크기는 container query(cqw)로 카드 폭에 비례해서 Instagram 1:1·LinkedIn 1.91:1 모두 같은 구성이에요 */
export function ShareCardPreview({ card, brand, demoLabel }: { card: ShareCard; brand: string; demoLabel: string }) {
  return (
    <div className={`sharecard sharecard--${card.template}`} role="img" aria-label={`${card.headline} ${card.title} ${card.subtitle}`}>
      <div className="sharecard__inner" aria-hidden="true">
        <p className="sharecard__head">{card.headline}</p>
        <div>
          <p className="sharecard__title">{card.title}</p>
          <p className="sharecard__sub">{card.subtitle}</p>
        </div>
        <div className="sharecard__stats">
          {card.stats.map((stat) => (
            <div key={stat.label} className="sharecard__stat">
              <b>{stat.value}</b>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
        <div className="sharecard__foot">
          <span className="sharecard__sdgs">
            {card.sdgIds.map((id) => (
              <span key={id} className="sharecard__sdg" style={{ background: getSdg(id).color, color: sdgTextColor(id) }}>
                {id}
              </span>
            ))}
          </span>
          <span>🧭 {brand}</span>
          <span className="sharecard__demo">{demoLabel}</span>
        </div>
      </div>
    </div>
  );
}
