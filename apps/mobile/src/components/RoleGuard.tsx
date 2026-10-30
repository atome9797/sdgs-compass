// 이 화면 묶음(area)이 지금 열려야 하는 묶음일 때만 children 을 그리고, 아니면 맞는 곳으로 보내요.
// 루트 레이아웃의 Stack.Protected 가 같은 일을 하지만, 상태가 바뀌는 순간 잠깐 어긋나도 잘못된 화면이 남지 않게 한 번 더 확인해요.
import { Redirect } from "expo-router";
import type { ReactNode } from "react";
import { useApp } from "@/lib/AppProvider";
import { redirectFor, type Gate } from "@/lib/routes";

export function RoleGuard({ area, children }: { area: Gate; children: ReactNode }) {
  const { gate } = useApp();
  const target = redirectFor(gate, area);
  if (target !== null) return <Redirect href={target} />;
  return <>{children}</>;
}
