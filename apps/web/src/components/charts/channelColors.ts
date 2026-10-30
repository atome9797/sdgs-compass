// SNS 마다 정해진 그래프 색. 색은 "대상"을 따라가요 — 어느 그래프에서나 X 는 같은 색, Instagram 은 같은 색(순서에 따라 바뀌지 않아요).
// 공식 SNS 게시 신청(X · Instagram · Facebook)은 SNS 지표(YouTube 까지 4개)의 부분집합이라 같은 표를 써요.
import type { SnsChannel } from "@sdgs-compass/core/adminSns";

export const CHANNEL_COLOR: Record<SnsChannel, string> = {
  x: "var(--adm-c1)",
  instagram: "var(--adm-c2)",
  facebook: "var(--adm-c3)",
  youtube: "var(--adm-c4)",
};
