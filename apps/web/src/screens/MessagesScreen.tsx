"use client";

// 메시지(스카우트 수신): 열면 읽음 처리, 수락/보류로 답해요. 1:1 채팅은 Phase 2.
import { useMemo, useState } from "react";
import { selectInbox, type InboxItemVM } from "@sdgs-compass/core/selectors";
import { Banner, Button, Empty, ScreenHead, Tag } from "@/components/ui";
import { useSession } from "@/lib/session";

function InboxItem({ item, open, onToggle }: { item: InboxItemVM; open: boolean; onToggle: () => void }) {
  const { t, dispatch } = useSession();
  return (
    <li className="card inbox-item">
      <button type="button" className="inbox-item__head" aria-expanded={open} aria-controls={`msg-${item.id}`} onClick={onToggle}>
        <span className="inbox-item__logo" style={{ background: item.companyAccent }} aria-hidden="true">
          {item.companyEmoji}
        </span>
        <span className="grow">
          <span className="inbox-item__title">{item.title}</span>
          <br />
          <span className="inbox-item__meta">
            {item.kindLabel} · {item.dateLabel}
          </span>
        </span>
        {item.unread ? <Tag tone="danger">{t("inbox.unread")}</Tag> : item.statusLabel ? <Tag tone={item.status === "accepted" ? "success" : undefined}>{item.statusLabel}</Tag> : null}
      </button>
      {open ? (
        <div id={`msg-${item.id}`} className="inbox-item__body">
          <p>{item.message}</p>
          {item.canRespond ? (
            <div className="row">
              <Button className="grow" onClick={() => dispatch({ type: "respondScout", scoutId: item.id, response: "accepted" })}>
                {t("inbox.accept")}
              </Button>
              <Button className="grow" variant="secondary" onClick={() => dispatch({ type: "respondScout", scoutId: item.id, response: "declined" })}>
                {t("inbox.decline")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function MessagesScreen() {
  const { demo, locale, t, dispatch } = useSession();
  const vm = useMemo(() => selectInbox(demo, locale), [demo, locale]);
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (item: InboxItemVM) => {
    const opening = openId !== item.id;
    setOpenId(opening ? item.id : null);
    if (opening && item.unread) dispatch({ type: "markScoutRead", scoutId: item.id });
  };

  return (
    <div className="screen">
      <ScreenHead title={t("inbox.title")} />
      {vm.items.length === 0 ? (
        <Empty>{t("inbox.empty")}</Empty>
      ) : (
        <ul className="card-list">
          {vm.items.map((item) => (
            <InboxItem key={item.id} item={item} open={openId === item.id} onToggle={() => toggle(item)} />
          ))}
        </ul>
      )}
      <Banner tone="info" icon="💬">
        {t("inbox.phase2")}
      </Banner>
    </div>
  );
}
