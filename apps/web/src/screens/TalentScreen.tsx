"use client";

// 인재 스카우트(F-601·602): 검색·SDG 필터 → 학생 카드 → 제안 메시지(초안이 미리 채워져 있어요) → 보내기.
// 기업은 하루에 3건까지, 같은 학생에게는 한 번만 보낼 수 있어요. 보낸 스카우트는 학생 화면의 "메시지"에 도착해요.
import { useMemo, useState, type FormEvent } from "react";
import type { ScoutKind } from "@sdgs-compass/core/domain";
import type { MessageKey } from "@sdgs-compass/core/messages";
import type { SdgId } from "@sdgs-compass/core/sdg";
import { selectSdgTiles, selectTalent, type CandidateVM } from "@sdgs-compass/core/selectors";
import { SdgChips, SdgMiniRow } from "@/components/sdg";
import { Banner, Button, Empty, Field, ScreenHead, Tag } from "@/components/ui";
import { useSession } from "@/lib/session";
import { nowIso } from "@/lib/time";

const KINDS: readonly ScoutKind[] = ["internship", "offer", "interview"];
const KIND_KEY: Record<ScoutKind, MessageKey> = { internship: "talent.kindInternship", offer: "talent.kindOffer", interview: "talent.kindInterview" };

function ScoutForm({ candidate, onSent, onCancel }: { candidate: CandidateVM; onSent: () => void; onCancel: () => void }) {
  const { t, dispatch } = useSession();
  const [kind, setKind] = useState<ScoutKind>("internship");
  const [message, setMessage] = useState(candidate.suggestedMessage);
  const [tried, setTried] = useState(false);
  const missing = message.trim() === "";

  const send = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (missing) return;
    dispatch({ type: "sendScout", candidateId: candidate.id, kind, message, at: nowIso() });
    onSent();
  };

  return (
    <form className="review-form" onSubmit={send} noValidate>
      <div className="stack stack--sm">
        <p className="field__label">{t("talent.kind")}</p>
        <div className="chips" role="radiogroup" aria-label={t("talent.kind")}>
          {KINDS.map((value) => (
            <button key={value} type="button" role="radio" aria-checked={kind === value} className="chip" onClick={() => setKind(value)}>
              {t(KIND_KEY[value])}
            </button>
          ))}
        </div>
      </div>
      <Field label={t("talent.compose")} error={tried && missing ? t("web.talent.messageRequired") : null}>
        {(props) => <textarea {...props} className="textarea" value={message} onChange={(event) => setMessage(event.target.value)} rows={4} />}
      </Field>
      <div className="row">
        <Button type="submit">{t("talent.send")}</Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

function CandidateCard({ candidate, composing, onCompose, onSent, onCancel }: { candidate: CandidateVM; composing: boolean; onCompose: () => void; onSent: () => void; onCancel: () => void }) {
  const { t } = useSession();
  return (
    <li className="card talent">
      <div className="talent__who">
        <span className="avatar" aria-hidden="true">
          {candidate.nickname.slice(0, 1)}
        </span>
        <div className="grow">
          <p className="talent__name">{candidate.nickname}</p>
          <p className="small muted">
            {candidate.university} · {candidate.faculty}
          </p>
        </div>
        <Tag tone="info">{candidate.levelLabel}</Tag>
      </div>
      <div className="row small muted">
        <span className="strong">{candidate.awardsLabel}</span>
        {candidate.isDemoStudent ? <Tag tone="warning">{t("web.talent.demoStudent")}</Tag> : null}
      </div>
      <SdgMiniRow ids={candidate.sdgIds} />
      <div className="chips">
        {candidate.skills.map((skill) => (
          <Tag key={skill}>{skill}</Tag>
        ))}
      </div>
      <p className="talent__bio">{candidate.bio}</p>

      {!candidate.scoutable ? (
        <div>
          <Tag>{t("talent.notScoutable")}</Tag>
        </div>
      ) : candidate.alreadySent ? (
        <div>
          <Tag tone="success">✓ {t("talent.alreadySent")}</Tag>
        </div>
      ) : composing ? (
        <ScoutForm candidate={candidate} onSent={onSent} onCancel={onCancel} />
      ) : (
        <div>
          <Button size="sm" onClick={onCompose} disabled={!candidate.canScout}>
            ✉️ {t("talent.propose")}
          </Button>
        </div>
      )}
    </li>
  );
}

export function TalentScreen() {
  const { demo, locale, t } = useSession();
  const [query, setQuery] = useState("");
  const [sdgIds, setSdgIds] = useState<SdgId[]>([]);
  const [composingId, setComposingId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const tiles = useMemo(() => selectSdgTiles(locale), [locale]);
  const vm = useMemo(() => selectTalent(demo, locale, { query, sdgIds }), [demo, locale, query, sdgIds]);
  const toggle = (id: SdgId) => setSdgIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  return (
    <>
      <ScreenHead title={t("talent.title")} />

      <form role="search" className="stack" onSubmit={(event) => event.preventDefault()}>
        <div style={{ maxWidth: 560 }}>
          <label className="sr-only" htmlFor="talent-q">
            {t("talent.searchPlaceholder")}
          </label>
          <input id="talent-q" className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("talent.searchPlaceholder")} enterKeyHint="search" />
        </div>
        <div className="stack stack--sm">
          <p className="section__hint">{t("talent.filterSdg")}</p>
          <SdgChips tiles={tiles} selected={sdgIds} onToggle={toggle} label={t("talent.filterSdg")} scroll />
        </div>
      </form>

      <div className="row row--between">
        <p className="strong" role="status">
          {vm.quotaLabel}
        </p>
        <span className="small muted">{t("web.talent.count", { count: vm.candidates.length })}</span>
      </div>
      {vm.remaining === 0 ? <Banner tone="warning">{t("talent.limitReached")}</Banner> : null}
      <div className="live" aria-live="polite">
        {sent ? <Banner tone="success">{t("talent.sentOk")}</Banner> : null}
      </div>

      {vm.candidates.length === 0 ? (
        <Empty>{t("talent.empty")}</Empty>
      ) : (
        <ul className="talent-grid">
          {vm.candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              composing={composingId === candidate.id}
              onCompose={() => {
                setSent(false);
                setComposingId(candidate.id);
              }}
              onSent={() => {
                setSent(true);
                setComposingId(null);
              }}
              onCancel={() => setComposingId(null)}
            />
          ))}
        </ul>
      )}
    </>
  );
}
