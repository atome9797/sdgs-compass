"use client";

// 디지털 증명서: 카드 + QR + 확인 코드. "진위 검증"은 내용을 다시 SHA-256 해시해 저장된 해시와 맞춰 보고, "위조 테스트"는 내용을 한 군데 바꿔서 불일치가 나는 것을 보여 줘요.
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { verifyCertificate } from "@sdgs-compass/core/certificate";
import { CERT_DISCLAIMER } from "@sdgs-compass/core/certification";
import { pick } from "@sdgs-compass/core/i18n";
import { certificateVM, selectCertificates, tamperedCopy } from "@sdgs-compass/core/selectors";
import { QrCode } from "@/components/QrCode";
import { SdgMiniRow } from "@/components/sdg";
import { Banner, Button, ButtonLink, Empty, Field, ScreenHead } from "@/components/ui";
import { buildHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";

/** 공용 문구는 "✓ " / "✗ " 로 시작해요. 배너가 이미 ✅·⛔ 아이콘을 보여 주니까 기호는 떼어 내서 이중으로 보이지 않게 해요 */
const withoutMark = (text: string) => text.replace(/^[✓✗✔✘]\s*/u, "");

/** 화면 미리보기·테스트용 */
export interface CertificatePreset {
  tampered?: boolean;
  verified?: boolean;
}

function CertificateView({ initialId, preset }: { initialId: string | null; preset?: CertificatePreset }) {
  const { demo, locale, t } = useSession();
  const certs = useMemo(() => selectCertificates(demo, locale), [demo, locale]);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [tampered, setTampered] = useState(preset?.tampered ?? false);
  const [result, setResult] = useState<boolean | null>(preset?.tampered ? false : preset?.verified ? true : null);

  const base = certs.find((c) => c.cert.id === selectedId) ?? certs[0];
  if (!base) {
    return (
      <div className="screen">
        <ScreenHead title={t("cert.title")} back={buildHref(ROUTES.impact)} backLabel={t("common.back")} />
        <Empty>{t("cert.empty")}</Empty>
      </div>
    );
  }
  // 위조 테스트 중에는 내용을 바꾼 사본을 보여 줘요 (해시는 그대로라서 검증이 실패해요)
  const shown = tampered ? certificateVM(tamperedCopy(base.cert), locale) : base;

  const select = (id: string) => {
    setSelectedId(id);
    setTampered(false);
    setResult(null);
  };
  const verify = () => setResult(verifyCertificate(shown.cert));
  const tamper = () => {
    const copy = tamperedCopy(base.cert);
    setTampered(true);
    setResult(verifyCertificate(copy));
  };
  const restore = () => {
    setTampered(false);
    setResult(null);
  };

  return (
    <div className="screen">
      <ScreenHead title={t("cert.title")} back={buildHref(ROUTES.impact)} backLabel={t("common.back")} />

      <Field label={t("cert.pick")}>
        {(props) => (
          <select {...props} className="select" value={base.cert.id} onChange={(event) => select(event.target.value)}>
            {certs.map((c) => (
              <option key={c.cert.id} value={c.cert.id}>
                {c.kindLabel} · {c.challengeTitle}
              </option>
            ))}
          </select>
        )}
      </Field>

      <article className={tampered ? "cert cert--tampered" : "cert"} aria-label={shown.kindLabel}>
        <span className="cert__kind">
          {shown.awardLabel ? "🏆 " : "🏅 "}
          {shown.kindLabel}
        </span>
        <h2 className="cert__title">{shown.challengeTitle}</h2>
        <div>
          <p className="small muted">{t("cert.holder")}</p>
          <p className="cert__holder">{shown.holder}</p>
        </div>
        {shown.awardLabel ? <p className="cert__award">{shown.awardLabel}</p> : null}
        <SdgMiniRow ids={shown.sdgIds} />
        <dl className="cert__meta">
          <dt>{t("cert.challenge")}</dt>
          <dd>{shown.companyName}</dd>
          <dt>{t("cert.issuedOn")}</dt>
          <dd>{shown.issuedOnLabel}</dd>
          <dt>{t("cert.id")}</dt>
          <dd className="mono">{shown.cert.id}</dd>
        </dl>
        <QrCode matrix={shown.qr} label={`${t("cert.code")} ${shown.code}`} />
        <div>
          <p className="small muted">{t("cert.code")}</p>
          <p className="cert__code mono">{shown.code}</p>
        </div>
        <div>
          <p className="small muted">{t("cert.hash")}</p>
          <p className="hash mono">{shown.cert.hash}</p>
        </div>
      </article>

      <section className="live" aria-live="polite">
        {result === null ? null : result ? <Banner tone="success">{withoutMark(t("cert.verified"))}</Banner> : <Banner tone="danger">{withoutMark(t("cert.tampered"))}</Banner>}
      </section>
      <div className="stack">
        <Button onClick={verify}>🔍 {t("cert.verify")}</Button>
        {tampered ? (
          <Button variant="secondary" onClick={restore}>
            ↩ {t("cert.restore")}
          </Button>
        ) : (
          <Button variant="secondary" onClick={tamper}>
            🧪 {t("cert.tamperTest")}
          </Button>
        )}
      </div>

      <Banner tone="info">{t("cert.qrNote")}</Banner>
      <p className="disclaimer">{pick(CERT_DISCLAIMER, locale)}</p>
      <ButtonLink href={buildHref(ROUTES.share)} variant="ghost">
        📣 {t("impact.shareButton")}
      </ButtonLink>
    </div>
  );
}

export function CertificateScreen({ preset }: { preset?: CertificatePreset }) {
  const id = useSearchParams().get("id");
  return <CertificateView key={id ?? ""} initialId={id} preset={preset} />;
}
