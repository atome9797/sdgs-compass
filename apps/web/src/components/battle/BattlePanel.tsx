"use client";

// 퀘스트 전투 화면(#38): 무대(WebGL) + 메시지 창 + 명령 4개(たたかう · スキル · しらべる · にげる) — 턴제 RPG 처럼 고르면 메시지가 한 줄씩 나와요.
// たたかう = 기획서 제출 화면으로 · スキル = 가진 스킬(수상 경력, SDG 번호)을 써서 이 퀘스트와의 상성(相性)을 봐요 · にげる = 퀘스트 목록으로.
// しらべる(#41) = 노벨 게임처럼 의뢰한 기업에게 선택지로 물어요(무엇이 곤란한지 · 할 일과 낼 것 · 마감과 보상). 이미 물은 것은 ✓(다시 물을 수 있어요).
// 메시지 창 위에는 이름표(누가 말하는지: 의뢰한 기업 · 용사, 해설은 없음). 창을 누르면 다음 줄(타자 중이면 그 줄을 한 번에).
// 화면 읽기 프로그램에는 「누가: 말」을 한 줄씩 통째로 알려요(aria-live).
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { BattleSkillVM, BattleVM, DialogueLine, LookTopicVM, TopicId } from "@sdgs-compass/core/battle";
import type { SkillEffectKind } from "@sdgs-compass/core/emblems";
import { getSdg, sdgTextColor } from "@sdgs-compass/core/sdg";
import { SdgEmblem } from "@/components/sdg";
import type { Effect, EffectKind } from "@/lib/battle/scene";
import { searchHref, submitHref } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { BattleStage } from "./BattleStage";

interface Queue {
  lines: DialogueLine[];
  /** 마지막 줄 뒤에 할 일 (auto 면 다 나온 뒤 저절로) */
  after?: () => void;
  auto?: boolean;
}

const COMMANDS = ["fight", "skill", "look", "run"] as const;
/** 명령 4개는 2×2(좌우 · 위아래), 선택지 · 스킬 목록은 한 줄씩(위아래) */
const GRID_STEPS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 };
const LIST_STEPS: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };
const TYPE_MS = 30;

/** 효과를 지금 시각으로 더해요 — 눌렀을 때(이벤트 처리기)만 불러요. 그리기 중에는 시각을 읽지 않아요 */
function pushEffect(list: Effect[], kind: EffectKind, color?: string, style?: SkillEffectKind): void {
  list.push({ kind, start: performance.now(), color, style });
}

/** 화살표 키로 단추 사이를 옮겨 다녀요(끝에서는 처음으로) */
function arrowKeys(steps: Record<string, number>) {
  return (event: KeyboardEvent<HTMLElement>) => {
    const step = steps[event.key];
    if (!step) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll("button")) as HTMLButtonElement[];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    event.preventDefault();
    buttons[(at + step + buttons.length) % buttons.length]?.focus();
  };
}
const moveInGrid = arrowKeys(GRID_STEPS);
const moveInList = arrowKeys(LIST_STEPS);

export function BattlePanel({ vm }: { vm: BattleVM }) {
  const { t } = useSession();
  const router = useRouter();
  const reduced = useReducedMotion();
  const effectsRef = useRef<Effect[]>([]);
  const kickRef = useRef<(() => void) | null>(null);
  const [queue, setQueue] = useState<Queue>(() => ({ lines: [...vm.intro, vm.ask] }));
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [menu, setMenu] = useState<"commands" | "skills" | "look">("commands");
  const [heard, setHeard] = useState<ReadonlySet<TopicId>>(() => new Set());

  const line = queue.lines[index] ?? vm.ask;
  const chars = useMemo(() => Array.from(line.text), [line]);
  const full = reduced || typed >= chars.length;
  const last = index >= queue.lines.length - 1;
  // 이름표: 의뢰한 기업(이모지 + 이름) · 용사. 해설은 이름표 없이
  const speaker = line.speaker === "client" ? vm.speakers.client.name : line.speaker === "hero" ? vm.speakers.hero.name : null;

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

  const say = (lines: DialogueLine[], after?: () => void, auto = false) => {
    setQueue({ lines, after, auto });
    setIndex(0);
    setTyped(0);
  };
  const play = (kind: EffectKind, color?: string, style?: SkillEffectKind) => {
    pushEffect(effectsRef.current, kind, color, style);
    kickRef.current?.();
  };
  const advance = () => {
    if (!full) setTyped(chars.length);
    else if (!last) {
      setIndex((i) => i + 1);
      setTyped(0);
    } else queue.after?.();
  };
  const backToCommands = () => {
    setMenu("commands");
    say([vm.ask]);
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
    // 기술(#42): 그 SDG 의 효과 모양과 색 — 14 큰 파도 · 6 물대포 · 7 번개 …
    play("skill", skill.move.color, skill.move.effect);
    say([...skill.lines, vm.ask]);
  };
  const look = () => {
    setMenu("look");
    say(vm.look.lines);
  };
  const ask = (topic: LookTopicVM) => {
    setHeard((prev) => new Set(prev).add(topic.id));
    say(topic.lines);
  };
  const readDetails = () => {
    document.getElementById("challenge-details")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };
  const run = () => {
    play("run");
    say(vm.run, () => router.push(searchHref()), true);
  };
  const actions = { fight, skill: openSkills, look, run };

  const showNext = full && (!last || queue.after !== undefined);
  return (
    <section className="battle" aria-label={t("battle.label")} data-phase={vm.phase}>
      <BattleStage vm={vm} effectsRef={effectsRef} kickRef={kickRef} reduced={reduced} />
      <div className="battle__console">
        <div className="talk" data-speaker={line.speaker}>
          {speaker ? (
            <p className="talk__name" aria-hidden="true" data-testid="battle-speaker">
              {line.speaker === "client" ? <span className="talk__emoji">{vm.speakers.client.emoji}</span> : null}
              {speaker}
            </p>
          ) : null}
          <button type="button" className="battle-msg" onClick={advance} aria-label={t("battle.next")} data-testid="battle-message">
            <span className="battle-msg__text" aria-hidden="true">
              {full ? line.text : chars.slice(0, typed).join("")}
            </span>
            {showNext ? (
              <span className="battle-msg__next" aria-hidden="true">
                ▼
              </span>
            ) : null}
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {speaker ? t("battle.says", { name: speaker, text: line.text }) : line.text}
        </p>
        {menu === "commands" ? (
          <div className="battle-cmds" role="group" aria-label={t("battle.commands")} onKeyDown={moveInGrid}>
            {COMMANDS.map((command) => (
              <button key={command} type="button" className="battle-cmd" onClick={actions[command]} data-command={command}>
                <span className="battle-cmd__name">{t(`battle.cmd.${command}`)}</span>
                <span className="battle-cmd__sub">{t(`battle.cmd.${command}Sub`)}</span>
              </button>
            ))}
          </div>
        ) : menu === "look" ? (
          <div className="choices" role="group" aria-label={t("battle.topics")} onKeyDown={moveInList}>
            {vm.look.topics.map((topic) => {
              const done = heard.has(topic.id);
              return (
                <button
                  key={topic.id}
                  type="button"
                  className="choice"
                  onClick={() => ask(topic)}
                  data-topic={topic.id}
                  data-heard={done ? "true" : undefined}
                  aria-label={done ? t("battle.topicHeard", { label: topic.label }) : undefined}
                >
                  <span className="choice__label">{topic.label}</span>
                  {done ? (
                    <span className="choice__heard" aria-hidden="true">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
            <button type="button" className="choice choice--sub" onClick={readDetails} data-topic="details">
              <span className="choice__label">{t("battle.look.details")}</span>
            </button>
            <button type="button" className="choice choice--back" onClick={backToCommands}>
              <span className="choice__label">{t("battle.back")}</span>
            </button>
          </div>
        ) : (
          <div className="battle-skills" role="group" aria-label={t("battle.cmd.skill")} onKeyDown={moveInList}>
            {vm.skills.map((skill) => (
              <button key={skill.id} type="button" className="battle-skill" onClick={() => castSkill(skill)} aria-label={skill.ariaLabel}>
                <SdgEmblem id={skill.move.sdgId} size={30} />
                <span className="battle-skill__main">
                  <span className="battle-skill__name">{skill.name}</span>
                  {/* 목표의 공식 이름은 그대로 보여요 — 기술 이름은 그 위에 더한 게임의 이름 */}
                  <span className="battle-skill__goal">
                    <span className="battle-skill__type" style={{ background: getSdg(skill.move.sdgId).color, color: sdgTextColor(skill.move.sdgId) }} aria-hidden="true">
                      {skill.move.sdgId}
                    </span>
                    {skill.move.goal}
                  </span>
                  <span className="battle-skill__move">{t("battle.skill.move", { move: skill.move.name })}</span>
                </span>
                {skill.match ? <span className="battle-skill__match">{t("battle.skill.match")}</span> : null}
                <span className="battle-skill__stars" aria-hidden="true">
                  {"★".repeat(skill.stars)}
                </span>
              </button>
            ))}
            <button type="button" className="battle-skill battle-skill--back" onClick={backToCommands}>
              {t("battle.back")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
