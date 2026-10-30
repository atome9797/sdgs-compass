import type { ReactNode } from "react";
import { B2bShell } from "@/components/Shells";

export default function B2bLayout({ children }: { children: ReactNode }) {
  return <B2bShell>{children}</B2bShell>;
}
