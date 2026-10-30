"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeTabId, type NavItem } from "@/lib/nav";
import { buildHref } from "@/lib/routes";
import { useSession } from "@/lib/session";

type Badges = Readonly<Record<string, number>>;

/** 하단 탭 (휴대폰 폭). 기업 화면에서는 1024px 이상이면 사이드바로 바뀌어 숨겨져요 */
export function TabBar({ items, badges = {}, variant = "b2c" }: { items: readonly NavItem[]; badges?: Badges; variant?: "b2c" | "b2b" }) {
  const pathname = usePathname();
  const { t } = useSession();
  const active = activeTabId(items, pathname);
  return (
    <nav className={variant === "b2b" ? "tabbar tabbar--b2b" : "tabbar"} aria-label={t("web.nav.main")}>
      {items.map((item) => {
        const badge = badges[item.id] ?? 0;
        return (
          <Link key={item.id} href={buildHref(item.path)} className="tab" aria-current={active === item.id ? "page" : undefined}>
            <span className="tab__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="tab__label">{t(item.labelKey)}</span>
            {badge > 0 ? (
              <span className="tab__badge" aria-label={`${badge} ${t("inbox.unread")}`}>
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** 기업 화면 왼쪽 사이드바의 메뉴 */
export function SideNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  const { t } = useSession();
  const active = activeTabId(items, pathname);
  return (
    <nav className="sidebar__nav" aria-label={t("web.nav.main")}>
      {items.map((item) => (
        <Link key={item.id} href={buildHref(item.path)} className="side-link" aria-current={active === item.id ? "page" : undefined}>
          <span className="side-link__icon" aria-hidden="true">
            {item.icon}
          </span>
          {t(item.labelKey)}
        </Link>
      ))}
    </nav>
  );
}
