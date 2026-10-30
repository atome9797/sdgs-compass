import type { ReactNode } from "react";
import { StudentShell } from "@/components/Shells";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}
