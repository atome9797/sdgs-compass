import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { COLORS } from "@sdgs-compass/core/theme";
import { Gate } from "@/components/Gate";
import { AppProvider } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  // 게임 제목(#37): 「勇者さま、助けてください！」 — 서비스 이름(SDGsコンパス)은 뒤에 함께
  title: { default: "勇者さま、助けてください！｜SDGsコンパス", template: "%s | 勇者さま、助けてください！" },
  description:
    "企業（依頼主）のSDGsの課題を、学生（勇者）がアイデアで解決するクエスト型マッチングのデモ版（サンプルデータ） / 기업(의뢰인)의 SDGs 과제를 학생(용사)이 아이디어로 해결하는 퀘스트형 매칭 데모(샘플 데이터)",
  applicationName: "勇者さま、助けてください！",
  appleWebApp: { capable: true, title: "勇者さま、助けて", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: COLORS.bg,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AppProvider>
          <Gate>{children}</Gate>
        </AppProvider>
      </body>
    </html>
  );
}
