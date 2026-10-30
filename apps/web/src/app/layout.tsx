import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { COLORS } from "@sdgs-compass/core/theme";
import { Gate } from "@/components/Gate";
import { AppProvider } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SDGsコンパス · SDGs 컴파스", template: "%s | SDGsコンパス" },
  description: "企業のSDGs課題と学生のアイデアをつなぐマッチングプラットフォームのデモ版（サンプルデータ） / 기업의 SDGs 과제와 학생의 아이디어를 잇는 매칭 플랫폼 데모(샘플 데이터)",
  applicationName: "SDGsコンパス",
  appleWebApp: { capable: true, title: "SDGsコンパス", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: COLORS.primary,
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
