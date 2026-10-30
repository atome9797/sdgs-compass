"use client";

import { ButtonLink } from "@/components/ui";
import { homeFor } from "@/lib/routes";
import { useSession } from "@/lib/session";

export default function NotFound() {
  const { t, role } = useSession();
  return (
    <main className="gate" id="main">
      <div className="gate__card">
        <div className="gate__logo" aria-hidden="true">
          🧭
        </div>
        <h1 className="gate__title">{t("error.notFound")}</h1>
        <ButtonLink href={homeFor(role)}>{role === "b2b" ? t("nav.dashboard") : t("nav.home")}</ButtonLink>
      </div>
    </main>
  );
}
