// 기업·단체(B2B) 화면 묶음: 아래 탭((tabs): 대시보드 · 피드 · 응모자 · 인재 · ESG·인증 · 설정)과 그 위에 쌓이는 새 챌린지 출제(new)·홍보 글쓰기(feed/new).
import { Stack } from "expo-router";
import { RoleGuard } from "@/components/RoleGuard";

export default function B2bLayout() {
  return (
    <RoleGuard area="b2b">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new" />
        <Stack.Screen name="feed/new" />
      </Stack>
    </RoleGuard>
  );
}
