"use client";

// 퀘스트 전투 화면(#38): 무대(WebGL) + 메시지 창 + 명령 4개(たたかう · スキル · しらべる · にげる) — 턴제 RPG 처럼 고르면 메시지가 한 줄씩 나와요.
// たたかう = 기획서 제출 화면으로 · スキル = 가진 스킬(수상 경력, SDG 번호)을 써서 이 퀘스트와의 상성(相性)을 봐요 · しらべる = 의뢰 내용 · にげる = 퀘스트 목록으로.
// 메시지 창을 누르면 다음 줄(타자 중이면 그 줄을 한 번에). 화면 읽기 프로그램에는 한 줄씩 통째로 알려요(aria-live).
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { BattleSkillVM, BattleVM } from "@sdgs-compass/core/battle";
import type { Effect, EffectKind } from "@/lib/battle/scene";
import { searchHref, submitHref } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { BattleStage } from "./BattleStage";

interface Queue {
  lines: string[];
  /** 마지막 줄 뒤에 할 일 (auto 면 다 나온 뒤 저절로) */
  after?: () => void;
  auto?: boolean;
}

const COMMANDS = ["fight", "skill", "look", "run"] as const;
const ARROWS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 };
const TYPE_MS = 32;

/** 효과를 지금 시각으로 더해요 — 눌렀을 때(이벤트 처리기)만 불러요. 그리기 중에는 시각을 읽지 않아요 */
function pushEffect(list: Effect[], kind: EffectKind, color?: string): void {
  list.push({ kind, start: performance.now(), color });
}

export function BattlePanel({ vm }: { vm: BattleVM }) {
  const { t } = useSession();
  const router = useRouter();
  const reduced = useReducedMotion();
  const effectsRef = useRef<Effect[]>([]);
  const kickRef = useRef<(() => void) | null>(null);
  const [queue, setQueue] = useState<Queue>(() => ({ lines: [...vm.intro, vm.ask] }));
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [menu, setMenu] = useState<"commands" | "skills">("commands");

  const line = queue.lines[index] ?? "";
  const chars = useMemo(() => Array.from(line), [line]);
  const full = reduced || typed >= chars.length;
  const last = index >= queue.lines.length - 1;

  // 글자를 한 자씩 (움직임 줄이기면 한 번에)
  useEffect(() => {
    if (full) return;
    const id = window.setInterval(() => setTyped((n) => n + 1), TYPE_MS);
    return () => window.clearInterval(id);
  }, [full, line]);

  // 마지막 줄까지 다 나오면, 갈 곳이 있는 명령(たたかう · にげる)은 저절로 다음으로
  useEffect(() => {
    if (!full || !last || !queue.after || !queue.auto) return;
    const id = window.setTimeout(queue.after, reduced ? 300 : 900);
    return () => window.clearTimeout(id);
  }, [full, last, queue, reduced]);

  const say = (lines: string[], after?: () => void, auto = false) => {
    setQueue({ lines, after, auto });
    setIndex(0);
    setTyped(0);
  };
  const play = (kind: EffectKind, color?: string) => {
    pushEffect(effectsRef.current, kind, color);
    kickRef.current?.();
  };
  const advance = () => {
    if (!full) setTyped(chars.length);
    else if (!last) {
      setIndex((i) => i + 1);
      setTyped(0);
    } else queue.after?.();
  };

  const fight = () => {
    play("fight");
    const go = vm.fight.go;
    if (go === "submit") say(vm.fight.lines, () => router.push(submitHref(vm.challengeId)), true);
    else say([...vm.fight.lines, vm.ask]);
  };
  const openSkills = () => {
    if (vm.skills.length === 0) {
      say([vm.skillPick, vm.ask]);
      return;
    }
    setMenu("skills");
    say([vm.skillPick]);
  };
  const castSkill = (skill: BattleSkillVM) => {
    setMenu("commands");
    play("skill", skill.color);
    say([...skill.lines, vm.ask]);
  };
  const look = () =>
    say(vm.look, () => {
      document.getElementById("challenge-details")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      say([vm.ask]);
    });
  const run = () => {
    play("run");
    say(vm.run, () => router.push(searchHref()), true);
  };
  const actions = { fight, skill: openSkills, look, run };

  // 명령 4개는 2×2 — 화살표 키로도 옮겨 다녀요
  const moveFocus = (event: KeyboardEvent<HTMLElement>) => {
    const step = ARROWS[event.key];
    if (!step) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll("button")) as HTMLButtonElement[];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    event.preventDefault();
    buttons[(at + step + buttons.length) % buttons.length]?.focus();
  };

  const showNext = full && (!last || queue.after !== undefined);
  return (
    <section className="battle" aria-label={t("battle.label")} data-phase={vm.phase}>
      <BattleStage vm={vm} effectsRef={effectsRef} kickRef={kickRef} reduced={reduced} />
      <div className="battle__console">
        <button type="button" className="battle-msg" onClick={advance} aria-label={t("battle.next")} data-testid="battle-message">
          <span className="battle-msg__text" aria-hidden="true">
            {full ? line : chars.slice(0, typed).join("")}
          </span>
          {showNext ? (
            <span className="battle-msg__next" aria-hidden="true">
              ▼
            </span>
          ) : null}
        </button>
        <p className="sr-only" aria-live="polite">
          {line}
        </p>
        {menu === "commands" ? (
          <div className="battle-cmds" role="group" aria-label={t("battle.commands")} onKeyDown={moveFocus}>
            {COMMANDS.map((command) => (
              <button key={command} type="button" className="battle-cmd" onClick={actions[command]} data-command={command}>
                <span className="battle-cmd__name">{t(`battle.cmd.${command}`)}</span>
                <span className="battle-cmd__sub">{t(`battle.cmd.${command}Sub`)}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="battle-skills" role="group" aria-label={t("battle.cmd.skill")} onKeyDown={moveFocus}>
            {vm.skills.map((skill) => (
              <button key={skill.id} type="button" className="battle-skill" onClick={() => castSkill(skill)} aria-label={skill.ariaLabel}>
                <span className="battle-skill__type" style={{ background: skill.color, color: skill.textColor }} aria-hidden="true">
                  {skill.sdgId}
                </span>
                <span className="battle-skill__name">{skill.name}</span>
                {skill.match ? <span className="battle-skill__match">{t("battle.skill.match")}</span> : null}
                <span className="battle-skill__stars" aria-hidden="true">
                  {"★".repeat(skill.stars)}
                </span>
              </button>
            ))}
            <button
              type="button"
              className="battle-skill battle-skill--back"
              onClick={() => {
                setMenu("commands");
                say([vm.ask]);
              }}
            >
              {t("battle.skill.back")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
