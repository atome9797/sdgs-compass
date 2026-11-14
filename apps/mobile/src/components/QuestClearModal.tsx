// 퀘스트 달성 팝업(#47, 앱): 웹과 같은 흐름 — 승리 연출 → 「クエスト達成！」 창 → 보상(상금 또는 상품) 고르기.
// 앱에는 전투 무대(WebGL)가 없어서, 연출은 과제 몬스터의 픽셀 그림 위에 스킬의 문장(#42)이 번쩍이고 몬스터가 흔들리다 쓰러지는 간단한 모양이에요.
// 움직임 줄이기가 켜져 있으면 연출 없이 창만. 한 번 본 연출은 다시 저절로 뜨지 않아요(celebrateQuest).
// 고르지 않은 보상은 마이 Impact 카드의 「報酬を えらぶ」로 창을 다시 열어요(useQuestClear().open).
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, useAnimatedValue, View } from "react-native";
import type { QuestReward } from "@sdgs-compass/core/domain";
import { pendingCelebration, selectQuestClear, type QuestClearVM } from "@sdgs-compass/core/questClear";
import { GAME_COLORS } from "@sdgs-compass/core/theme";
import { FoeImage } from "@/components/FoeImage";
import { SdgEmblem } from "@/components/SdgEmblem";
import { useApp } from "@/lib/AppProvider";

/** 연출 한 줄의 길이(ms) */
const STEP_MS = 1500;
/** 몬스터가 쓰러지고 창이 뜰 때까지 */
const FINISH_MS = 1700;

function Victory({ vm, onDone }: { vm: QuestClearVM; onDone: () => void }) {
  const [at, setAt] = useState(0);
  const finished = at >= vm.steps.length;
  const step = vm.steps[at];
  const line = finished ? vm.finish : (step?.line ?? vm.finish);
  const hp = finished ? 0 : vm.battle.foe.hpPercent;
  const shake = useAnimatedValue(0);
  const burst = useAnimatedValue(0);
  const fade = useAnimatedValue(1);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  // 한 줄마다: 스킬이면 문장이 번쩍이고 몬스터가 흔들려요. 다 쓰면 몬스터가 흐려지고(쓰러짐) 잠시 뒤 창으로
  useEffect(() => {
    if (step?.skill) {
      burst.setValue(0);
      Animated.sequence([Animated.timing(burst, { toValue: 1, duration: 450, useNativeDriver: true }), Animated.timing(burst, { toValue: 0, duration: 450, delay: 200, useNativeDriver: true })]).start();
      Animated.sequence([
        Animated.delay(350),
        ...[8, -8, 6, -6, 0].map((toValue) => Animated.timing(shake, { toValue, duration: 60, useNativeDriver: true })),
      ]).start();
    }
    if (finished) Animated.timing(fade, { toValue: 0.25, duration: 900, delay: 200, useNativeDriver: true }).start();
    const id = setTimeout(() => (finished ? doneRef.current() : setAt((n) => n + 1)), finished ? FINISH_MS : STEP_MS);
    return () => clearTimeout(id);
  }, [at, finished, step, burst, shake, fade]);

  const scale = burst.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.5] });
  return (
    <View style={styles.victory} testID="clear-victory">
      <View style={styles.stage} accessible accessibilityLabel={vm.battle.sceneAlt}>
        <View style={styles.foeCard}>
          <Text style={styles.foeName}>{vm.battle.foe.name}</Text>
          <View style={styles.hpRow}>
            <Text style={styles.hpLabel}>HP</Text>
            <View style={styles.hpTrack}>
              <View style={[styles.hpBar, { width: `${hp}%` }]} testID="clear-hp" />
            </View>
          </View>
        </View>
        <Animated.View style={{ opacity: fade, transform: [{ translateX: shake }] }}>
          <FoeImage kind={vm.battle.foe.kind} color={vm.battle.foe.color} size={132} />
        </Animated.View>
        {step?.skill && !finished ? (
          <Animated.View style={[styles.burst, { opacity: burst, transform: [{ scale }] }]} pointerEvents="none">
            <SdgEmblem id={step.skill.sdgId} size={64} />
          </Animated.View>
        ) : null}
      </View>
      <View style={styles.msg} accessibilityLiveRegion="polite" testID="clear-message">
        <Text style={styles.msgText}>{line.text}</Text>
      </View>
      <Pressable style={styles.skip} onPress={onDone} accessibilityRole="button" testID="clear-skip">
        <Text style={styles.skipText}>{vm.skipLabel} ▶▶</Text>
      </Pressable>
    </View>
  );
}

function ClearWindow({ vm, onChoose, onClose }: { vm: QuestClearVM; onChoose: (reward: QuestReward) => void; onClose: () => void }) {
  const reward = vm.reward;
  const [selected, setSelected] = useState<QuestReward | null>(reward && !reward.choose ? (reward.options[0]?.kind ?? null) : null);
  const pending = reward !== null && reward.chosen === null;
  return (
    <ScrollView contentContainerStyle={styles.window} testID="clear-window">
      <Text style={styles.title} accessibilityRole="header">
        {vm.title}
      </Text>
      <Text style={styles.company}>{vm.companyName}</Text>
      <Text style={styles.quest}>{vm.questTitle}</Text>
      <Text style={styles.award}>
        🏆 {vm.awardLabel} <Text style={styles.stars}>{"★".repeat(vm.stars)}</Text>
        <Text style={styles.starsOff}>{"★".repeat(3 - vm.stars)}</Text>
      </Text>
      {vm.learnedLines.length > 0 ? (
        <View style={styles.learned}>
          <View style={styles.icons}>
            {vm.learnedSdgIds.map((id) => (
              <SdgEmblem key={id} id={id} size={26} />
            ))}
          </View>
          <View style={styles.lines}>
            {vm.learnedLines.map((text) => (
              <Text key={text} style={styles.learnedText}>
                {text}
              </Text>
            ))}
          </View>
        </View>
      ) : null}
      {vm.expLabel ? <Text style={styles.exp}>{vm.expLabel}</Text> : null}
      {vm.statusLevelUps.map((text) => (
        <Text key={text} style={styles.levelUp}>
          ⬆ {text}
        </Text>
      ))}

      {reward ? (
        pending ? (
          <View style={styles.choice} testID="reward-choice" accessibilityRole={reward.choose ? "radiogroup" : undefined}>
            <Text style={styles.prompt}>{reward.prompt}</Text>
            {reward.options.map((option) => {
              const on = selected === option.kind;
              return (
                <Pressable
                  key={option.kind}
                  style={[styles.option, on ? styles.optionOn : null]}
                  onPress={() => setSelected(option.kind)}
                  disabled={!reward.choose}
                  accessibilityRole={reward.choose ? "radio" : undefined}
                  accessibilityState={reward.choose ? { checked: on } : undefined}
                  accessibilityLabel={`${option.label}、${option.detail}`}
                  testID={`reward-option-${option.kind}`}
                >
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <View style={styles.optionMain}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    <Text style={styles.optionDetail}>{option.detail}</Text>
                  </View>
                  {on && reward.choose ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
            <Text style={styles.note}>{reward.note}</Text>
            <Pressable
              style={[styles.confirm, selected === null ? styles.confirmOff : null]}
              disabled={selected === null}
              onPress={() => selected && onChoose(selected)}
              accessibilityRole="button"
              accessibilityState={{ disabled: selected === null }}
              testID="reward-confirm"
            >
              <Text style={styles.confirmText}>{reward.confirmLabel}</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.chosen} testID="reward-chosen">
            ✓ {reward.chosenLabel}
          </Text>
        )
      ) : null}

      <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" testID="clear-close">
        <Text style={styles.closeText}>{pending ? vm.laterLabel : vm.closeLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}

/** 팝업 본체: 연출(처음 한 번, 움직임 줄이기가 아니면) → 창. 안드로이드의 뒤로 가기는 「あとで」와 같아요 */
export function QuestClearModal({ vm, onSeen, onChoose, onClose }: { vm: QuestClearVM; onSeen: () => void; onChoose: (reward: QuestReward) => void; onClose: () => void }) {
  const [stage, setStage] = useState<"victory" | "window">(vm.fresh ? "victory" : "window");
  const toWindow = () => {
    setStage("window");
    onSeen();
  };
  // 움직임 줄이기가 켜져 있으면 연출을 건너뛰어요(설정을 읽는 것은 비동기)
  const seenRef = useRef(toWindow);
  useEffect(() => {
    seenRef.current = toWindow;
  });
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (alive && reduce) seenRef.current();
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} testID="quest-clear">
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          {stage === "victory" ? <Victory vm={vm} onDone={toWindow} /> : <ClearWindow vm={vm} onChoose={onChoose} onClose={onClose} />}
        </View>
      </View>
    </Modal>
  );
}

interface QuestClearApi {
  /** 마이 Impact 카드의 「報酬を えらぶ」 — 그 수상의 창을 열어요 */
  open: (proposalId: string) => void;
}
const QuestClearContext = createContext<QuestClearApi | null>(null);
export const useQuestClear = (): QuestClearApi | null => useContext(QuestClearContext);

/** 학생 탭 틀에 한 번: 아직 안 본 수상이 있으면 저절로 열고, 카드에서 부르면 그 수상의 창을 열어요(웹 QuestClearHost 와 같은 규칙) */
export function QuestClearHost({ children }: { children: ReactNode }) {
  const { demo, locale, dispatch } = useApp();
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
        <QuestClearModal
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

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 12, backgroundColor: "rgba(8, 14, 28, 0.78)" },
  sheet: { width: "100%", maxWidth: 430, maxHeight: "100%", padding: 12, borderRadius: 16, backgroundColor: GAME_COLORS.window },
  victory: { gap: 10 },
  stage: { height: 230, alignItems: "center", justifyContent: "flex-end", paddingBottom: 18, borderRadius: 10, backgroundColor: "#2B5A8F", overflow: "hidden" },
  foeCard: { position: "absolute", top: 10, left: 10, minWidth: "46%", padding: 8, gap: 4, borderRadius: 8, borderWidth: 2, borderColor: GAME_COLORS.ink, backgroundColor: GAME_COLORS.panel },
  foeName: { fontSize: 13, fontWeight: "800", color: GAME_COLORS.ink },
  hpRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  hpLabel: { paddingHorizontal: 4, fontSize: 10, fontWeight: "900", color: GAME_COLORS.speaker, backgroundColor: GAME_COLORS.ink, borderRadius: 3 },
  hpTrack: { flex: 1, height: 9, overflow: "hidden", borderWidth: 2, borderColor: GAME_COLORS.ink, borderRadius: 4, backgroundColor: GAME_COLORS.hpTrack },
  hpBar: { height: "100%", backgroundColor: GAME_COLORS.hp },
  burst: { position: "absolute", bottom: 60 },
  msg: { minHeight: 86, padding: 12, borderWidth: 3, borderColor: GAME_COLORS.frame, borderRadius: 8 },
  msgText: { fontSize: 15, fontWeight: "700", lineHeight: 25, color: GAME_COLORS.frame },
  skip: { alignSelf: "flex-end", minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderWidth: 2, borderColor: GAME_COLORS.speaker, borderRadius: 8 },
  skipText: { fontSize: 13, fontWeight: "800", color: GAME_COLORS.speaker },
  window: { gap: 10, padding: 14, borderWidth: 3, borderColor: GAME_COLORS.frame, borderRadius: 10 },
  title: { textAlign: "center", fontSize: 30, fontWeight: "900", letterSpacing: 2, color: GAME_COLORS.speaker },
  company: { textAlign: "center", fontSize: 11, fontWeight: "800", color: GAME_COLORS.reward },
  quest: { textAlign: "center", fontSize: 15, fontWeight: "900", lineHeight: 21, color: GAME_COLORS.frame },
  award: { textAlign: "center", fontSize: 15, fontWeight: "900", color: GAME_COLORS.speaker },
  stars: { color: "#FFC93C" },
  starsOff: { color: "#4A5873" },
  learned: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderWidth: 2, borderColor: "rgba(255, 215, 94, 0.5)", borderRadius: 8 },
  icons: { flexDirection: "row", gap: 3, padding: 2, borderRadius: 5, backgroundColor: GAME_COLORS.panel },
  lines: { flex: 1, gap: 2 },
  learnedText: { fontSize: 13, fontWeight: "800", color: GAME_COLORS.speaker },
  exp: { fontSize: 13, fontWeight: "800", color: GAME_COLORS.reward },
  levelUp: { fontSize: 13, fontWeight: "800", color: "#9BE8B4" },
  choice: { gap: 8, padding: 10, borderWidth: 2, borderColor: GAME_COLORS.frame, borderRadius: 8 },
  prompt: { fontSize: 13, fontWeight: "900", color: GAME_COLORS.frame },
  option: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, padding: 10, borderWidth: 3, borderColor: GAME_COLORS.ink, borderRadius: 8, backgroundColor: GAME_COLORS.panel },
  optionOn: { borderColor: GAME_COLORS.speaker },
  optionIcon: { fontSize: 26 },
  optionMain: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 15, fontWeight: "900", color: GAME_COLORS.ink },
  optionDetail: { fontSize: 11, fontWeight: "700", lineHeight: 16, color: "#4A5568" },
  check: { fontSize: 18, fontWeight: "900", color: "#0F6B4C" },
  note: { fontSize: 11, fontWeight: "700", lineHeight: 17, color: GAME_COLORS.reward },
  confirm: { minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderWidth: 3, borderColor: GAME_COLORS.frame, borderRadius: 8, backgroundColor: GAME_COLORS.speaker },
  confirmOff: { opacity: 0.45 },
  confirmText: { fontSize: 15, fontWeight: "900", color: GAME_COLORS.ink },
  chosen: { padding: 10, fontSize: 13, fontWeight: "800", lineHeight: 20, color: "#9BE8B4", borderWidth: 2, borderColor: "#9BE8B4", borderRadius: 8 },
  close: { alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: 18, borderWidth: 2, borderColor: "rgba(255, 255, 255, 0.5)", borderRadius: 8 },
  closeText: { fontSize: 13, fontWeight: "800", color: GAME_COLORS.frame },
});
