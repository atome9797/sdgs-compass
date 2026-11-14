"use client";

// 퀘스트 달성 팝업(#47): 기업이 내 기획서를 고르면(수상) 학생 화면을 다음에 열 때 떠요.
// ① 승리 연출 — 전투 무대(BattleStage) 위에서 이번 수상의 SDG 스킬 → 가진 스킬 순서로 기술을 쓰고, 마지막에 몬스터를 쓰러뜨려요.
// ② 「クエスト達成！」 창 — 상 · 얻은 스킬 · 평가 EXP, 그리고 보상(상금 또는 상품) 고르기.
// 움직임 줄이기면 ①을 건너뛰고 ②만. 「スキップ」으로도 건너뛸 수 있어요. 한 번 본 연출은 다시 저절로 뜨지 않아요(celebrateQuest).
// 고르지 않은 보상은 마이 Impact 카드의 「報酬を えらぶ」로 이 창을 다시 열어요(useQuestClear().open).
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { QuestReward } from "@sdgs-compass/core/domain";
import { pendingCelebration, selectQuestClear, type QuestClearVM } from "@sdgs-compass/core/questClear";
import { SdgEmblem } from "@/components/sdg";
import type { Effect } from "@/lib/battle/scene";
import { useSession } from "@/lib/session";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { BattleStage } from "./BattleStage";

/** 연출 한 줄의 길이(ms) — 기술 효과(1.3초)가 끝날 만큼 */
const STEP_MS = 1500;
/** 몬스터가 쓰러지고 창이 뜰 때까지 */
const FINISH_MS = 1900;

function Victory({ vm, reduced, onDone, skipLabel }: { vm: QuestClearVM; reduced: boolean; onDone: () => void; skipLabel: string }) {
  const effectsRef = useRef<Effect[]>([]);
  const kickRef = useRef<(() => void) | null>(null);
  // 부모가 다시 그려져도 타이머가 처음부터 다시 돌지 않게, 끝난 뒤 할 일은 ref 로
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });
  const [at, setAt] = useState(0);
  const finished = at >= vm.steps.length;
  const line = finished ? vm.finish : vm.steps[at]?.line ?? vm.finish;
  const hp = finished ? 0 : vm.battle.foe.hpPercent;
  const stage = useMemo(() => ({ ...vm.battle, foe: { ...vm.battle.foe, hpPercent: hp } }), [vm.battle, hp]);

  // 한 줄마다: 기술이면 효과를 더하고, 다 쓰면 몬스터를 쓰러뜨려요(clear 효과) → 잠시 뒤 창으로
  useEffect(() => {
    const step = vm.steps[at];
    const now = performance.now();
    // 기술: 용사 팀이 한 번 뛰어오르고(fight) 그 SDG 의 효과(#42)
    if (step?.skill) effectsRef.current.push({ kind: "fight", start: now }, { kind: "skill", start: now + 120, color: step.skill.color, style: step.skill.effect });
    if (finished) effectsRef.current.push({ kind: "clear", start: now + 200 });
    kickRef.current?.();
    const id = window.setTimeout(() => (finished ? doneRef.current() : setAt((n) => n + 1)), finished ? FINISH_MS : STEP_MS);
    return () => window.clearTimeout(id);
  }, [at, finished, vm.steps]);

  return (
    <div className="quest-clear__victory">
      <div className="battle" data-phase="victory">
        <BattleStage vm={stage} effectsRef={effectsRef} kickRef={kickRef} reduced={reduced} />
        <div className="battle__console">
          <div className="talk" data-speaker="narrator">
            <p className="battle-msg quest-clear__msg" role="status" aria-live="polite" data-testid="clear-message">
              <span className="battle-msg__text">{line.text}</span>
            </p>
          </div>
        </div>
      </div>
      <button type="button" className="quest-clear__skip" onClick={onDone}>
        {skipLabel} ▶▶
      </button>
    </div>
  );
}

function ClearWindow({ vm, onChoose, onClose }: { vm: QuestClearVM; onChoose: (reward: QuestReward) => void; onClose: () => void }) {
  const reward = vm.reward;
  const [selected, setSelected] = useState<QuestReward | null>(reward && !reward.choose ? (reward.options[0]?.kind ?? null) : null);
  const pending = reward !== null && reward.chosen === null;
  return (
    <div className="quest-clear__window rpg-window" data-testid="clear-window">
      <p className="quest-clear__title" id="quest-clear-title">
        {vm.title}
      </p>
      <p className="quest-clear__quest">
        <span className="quest-clear__company">{vm.companyName}</span>
        <span className="quest-clear__name">{vm.questTitle}</span>
      </p>
      <p className="quest-clear__award">
        <span aria-hidden="true">🏆 </span>
        {vm.awardLabel}
        <span className="quest-clear__stars" aria-hidden="true">
          {"★".repeat(vm.stars)}
          <span className="quest-clear__stars-off">{"★".repeat(3 - vm.stars)}</span>
        </span>
      </p>
      {vm.learnedLines.length > 0 ? (
        <div className="quest-clear__learned">
          <span className="quest-clear__icons" aria-hidden="true">
            {vm.learnedSdgIds.map((id) => (
              <SdgEmblem key={id} id={id} size={26} />
            ))}
          </span>
          <span className="quest-clear__lines">
            {vm.learnedLines.map((text) => (
              <span key={text}>{text}</span>
            ))}
          </span>
        </div>
      ) : null}
      {vm.expLabel ? (
        <p className="quest-clear__exp">
          {vm.expLabel}
          {vm.statusLevelUps.map((text) => (
            <span key={text} className="quest-clear__levelup">
              <span aria-hidden="true">⬆ </span>
              {text}
            </span>
          ))}
        </p>
      ) : null}

      {reward ? (
        pending ? (
          <fieldset className="reward-choice" data-testid="reward-choice">
            <legend className="reward-choice__prompt">{reward.prompt}</legend>
            <div className="reward-choice__options">
              {reward.options.map((option) =>
                reward.choose ? (
                  <label key={option.kind} className="reward-option" data-selected={selected === option.kind ? "true" : undefined}>
                    <input type="radio" name="quest-reward" value={option.kind} checked={selected === option.kind} onChange={() => setSelected(option.kind)} />
                    <span className="reward-option__icon" aria-hidden="true">
                      {option.icon}
                    </span>
                    <span className="reward-option__main">
                      <span className="reward-option__label">{option.label}</span>
                      <span className="reward-option__detail">{option.detail}</span>
                    </span>
                  </label>
                ) : (
                  <div key={option.kind} className="reward-option" data-selected="true">
                    <span className="reward-option__icon" aria-hidden="true">
                      {option.icon}
                    </span>
                    <span className="reward-option__main">
                      <span className="reward-option__label">{option.label}</span>
                      <span className="reward-option__detail">{option.detail}</span>
                    </span>
                  </div>
                ),
              )}
            </div>
            <p className="reward-choice__note">{reward.note}</p>
            <button type="button" className="quest-clear__confirm" disabled={selected === null} onClick={() => selected && onChoose(selected)} data-testid="reward-confirm">
              {reward.confirmLabel}
            </button>
          </fieldset>
        ) : (
          <p className="reward-chosen" data-testid="reward-chosen">
            <span aria-hidden="true">✓ </span>
            {reward.chosenLabel}
          </p>
        )
      ) : null}

      <button type="button" className="quest-clear__close" onClick={onClose} data-testid="clear-close">
        {pending ? vm.laterLabel : vm.closeLabel}
      </button>
    </div>
  );
}

/** 팝업 본체: 연출(처음 한 번) → 창. 브라우저의 <dialog> 라서 뒤의 화면은 누를 수 없고, Esc 는 「あとで」와 같아요 */
export function QuestClearDialog({ vm, onSeen, onChoose, onClose }: { vm: QuestClearVM; onSeen: () => void; onChoose: (reward: QuestReward) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<"victory" | "window">(vm.fresh && !reduced ? "victory" : "window");
  // 연출이 끝나면(또는 「スキップ」) 창으로 — 그때 「봤어요」(다음부터 저절로 뜨지 않아요)
  const toWindow = () => {
    setStage("window");
    onSeen();
  };

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="quest-clear"
      aria-labelledby="quest-clear-title"
      data-stage={stage}
      data-testid="quest-clear"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {stage === "victory" ? (
        <>
          <p className="sr-only" id="quest-clear-title">
            {vm.ariaLabel}
          </p>
          <Victory vm={vm} reduced={reduced} onDone={toWindow} skipLabel={vm.skipLabel} />
        </>
      ) : (
        <ClearWindow vm={vm} onChoose={onChoose} onClose={onClose} />
      )}
    </dialog>
  );
}

interface QuestClearApi {
  /** 마이 Impact 카드의 「報酬を えらぶ」 — 그 수상의 창을 열어요 */
  open: (proposalId: string) => void;
}
const QuestClearContext = createContext<QuestClearApi | null>(null);
export const useQuestClear = (): QuestClearApi | null => useContext(QuestClearContext);

/**
 * 학생 화면 틀에 한 번: 아직 안 본 수상이 있으면 저절로 열고(pending), 카드에서 부르면 그 수상의 창을 열어요(openId).
 * 「봤어요」 · 보상을 고르면 그 수상이 더는 pending 이 아니라서, 그 전에 openId 로 붙잡아 두고 창을 계속 보여요.
 */
export function QuestClearHost({ children }: { children: ReactNode }) {
  const { demo, locale, dispatch } = useSession();
  const [openId, setOpenId] = useState<string | null>(null);
  const [closed, setClosed] = useState<string | null>(null);
  const pending = useMemo(() => pendingCelebration(demo)?.id ?? null, [demo]);
  const activeId = openId ?? (pending !== closed ? pending : null);
  const vm = useMemo(() => (activeId ? selectQuestClear(demo, locale, activeId) : null), [demo, locale, activeId]);
  const api = useMemo<QuestClearApi>(() => ({ open: setOpenId }), []);
  return (
    <QuestClearContext.Provider value={api}>
      {children}
      {vm ? (
        <QuestClearDialog
          key={vm.proposalId}
          vm={vm}
          onSeen={() => {
            setOpenId(vm.proposalId);
            dispatch({ type: "celebrateQuest", proposalId: vm.proposalId });
          }}
          onChoose={(reward) => {
            setOpenId(vm.proposalId);
            dispatch({ type: "chooseReward", proposalId: vm.proposalId, reward });
          }}
          onClose={() => {
            setClosed(vm.proposalId);
            setOpenId(null);
            dispatch({ type: "celebrateQuest", proposalId: vm.proposalId });
          }}
        />
      ) : null}
    </QuestClearContext.Provider>
  );
}
