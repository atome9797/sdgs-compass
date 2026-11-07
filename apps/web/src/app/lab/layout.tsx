import type { ReactNode } from "react";
import { LabShell } from "@/components/Shells";

export default function LabLayout({ children }: { children: ReactNode }) {
  return <LabShell>{children}</LabShell>;
}
