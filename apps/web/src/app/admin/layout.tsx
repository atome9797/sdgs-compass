import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/screens/AdminShell";
import "../admin.css";

// 운영자 화면은 데모라서 검색에 나오지 않게 해요 (실제 운영에서는 로그인과 관리자 권한 뒤에 두어야 해요 — docs/admin.md)
export const metadata: Metadata = {
  title: "運営者画面 · 운영자 화면",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
