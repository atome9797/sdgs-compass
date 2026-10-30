// 없는 경로로 왔을 때(잘못된 링크 등): 안내와 처음 화면으로 돌아가는 단추.
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Button, Notice } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { GATE_HREF } from "@/lib/routes";

export function NotFoundScreen() {
  const { t, gate } = useApp();
  const router = useRouter();
  return (
    <Screen testID="screen-not-found">
      <Notice tone="warning" title={t("error.notFound")} />
      <Button label={t("mobile.notFoundBack")} onPress={() => router.replace(GATE_HREF[gate])} />
    </Screen>
  );
}
