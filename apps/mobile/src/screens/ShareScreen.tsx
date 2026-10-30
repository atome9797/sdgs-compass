// SCR-05 SNS 카드뉴스: 템플릿(Instagram 1:1 · LinkedIn 1.91:1)과 성과를 고르면 카드가 만들어져요 → 운영체제 공유 메뉴로 보내거나, 앱 안에 저장(발신 실적).
// 카드와 글에는 닉네임과 성과만 들어가요(share.privacy). 공유 메뉴는 React Native 의 Share 를 써서 새 네이티브 모듈이 필요 없어요.
import { useMemo, useState } from "react";
import { Share, StyleSheet, View, useWindowDimensions } from "react-native";
import { selectShare } from "@sdgs-compass/core/selectors";
import { CARD_TEMPLATES, type CardTemplate } from "@sdgs-compass/core/shareCard";
import { OptionRow } from "@/components/OptionRow";
import { Screen } from "@/components/Screen";
import { ShareCardPreview } from "@/components/ShareCardPreview";
import { Badge, Button, Empty, Notice, Section, Segmented, Txt, type NoticeTone } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { contentWidthFor } from "@/lib/geometry";
import { hashtagList, savePoints, sharePayload, TEMPLATE_LABEL_KEY } from "@/lib/shareText";
import { SPACE } from "@/theme";

interface ShareNotice {
  tone: NoticeTone;
  text: string;
}

export function ShareScreen() {
  const { demo, locale, t, dispatch } = useApp();
  const { width } = useWindowDimensions();
  const [template, setTemplate] = useState<CardTemplate>("instagram");
  const [activityId, setActivityId] = useState<string | null>(null);
  const [notice, setNotice] = useState<ShareNotice | null>(null);
  const vm = useMemo(() => selectShare(demo, locale, template, activityId), [demo, locale, template, activityId]);
  const card = vm.card;

  const templateOptions = CARD_TEMPLATES.map((id) => ({ value: id, label: t(TEMPLATE_LABEL_KEY[id]) }));

  const share = async () => {
    if (!card) return;
    try {
      const result = await Share.share(sharePayload(card));
      // 취소(dismissedAction)는 iOS 에서만 와요. 공유 메뉴를 열었을 때만 안내를 보여요.
      setNotice(result.action === Share.sharedAction ? { tone: "success", text: t("mobile.shareDone") } : null);
    } catch {
      setNotice({ tone: "danger", text: t("error.generic") });
    }
  };

  const save = () => {
    const points = savePoints(demo.shares);
    dispatch({ type: "recordShare" });
    setNotice({ tone: "success", text: t("share.saved", { points }) });
  };

  return (
    <Screen backTitle={t("share.title")} testID="screen-share">
      {!card ? (
        <Empty testID="share-empty">{t("share.noActivity")}</Empty>
      ) : (
        <>
          <Section title={t("mobile.templateLabel")}>
            <Segmented options={templateOptions} value={template} onChange={setTemplate} accessibilityLabel={t("mobile.templateLabel")} />
          </Section>

          <Section title={t("share.pickActivity")}>
            <View style={styles.stack}>
              {vm.options.map((option) => (
                <OptionRow key={option.id} testID={`share-activity-${option.id}`} title={option.label} selected={option.id === vm.selectedId} onPress={() => setActivityId(option.id)} />
              ))}
            </View>
          </Section>

          <Section title={t("mobile.preview")}>
            <ShareCardPreview
              card={card}
              brand={t("app.name")}
              demoLabel={t("app.demoBadge")}
              width={contentWidthFor(width)}
              accessibilityLabel={`${t("mobile.preview")}: ${card.headline}, ${card.title}, ${card.subtitle}`}
            />
          </Section>

          <Section title={t("mobile.captionLabel")}>
            <Txt selectable testID="share-caption">
              {card.caption}
            </Txt>
            <View style={styles.tags}>
              {hashtagList(card.hashtags).map((tag) => (
                <Badge key={tag} tone="primary" label={tag} />
              ))}
            </View>
          </Section>

          {notice ? <Notice testID="share-notice" tone={notice.tone} message={notice.text} /> : null}

          <View style={styles.stack}>
            <Button testID="share-send" icon="📤" label={t("share.send")} onPress={share} />
            <Button testID="share-save" variant="secondary" icon="💾" label={t("share.saveInApp")} onPress={save} />
          </View>
          <Txt variant="small" tone="muted">
            🔒 {t("share.privacy")}
          </Txt>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACE.md },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.xs + 2 },
});
