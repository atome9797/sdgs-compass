// F-502 디지털 증명서: 내용으로 SHA-256 해시를 만들어 두고, 나중에 내용을 다시 해시해서 맞춰 보면 위·변조를 바로 알 수 있어요.
// 데모에서는 해시와 QR(확인 문구)까지 구현했고, 블록체인 기록·공개 검증 페이지는 Phase 2 예정이에요.
import type { Activity, AwardKind } from "./domain";
import { pick, type Text } from "./i18n";
import { sha256Hex } from "./hash";
import type { SdgId } from "./sdg";

export interface Certificate {
  id: string;
  kind: "participation" | "award";
  holder: string;
  challengeTitle: Text;
  companyName: Text;
  award: AwardKind | null;
  sdgIds: SdgId[];
  points: number;
  issuedOn: string;
  hash: string;
}

/** 언어가 바뀌어도 해시가 같도록, 문구는 항상 일본어 쪽(문자열이면 그대로)으로 적어요 */
function canonical(text: Text): string {
  return typeof text === "string" ? text : pick(text, "ja");
}

export function certificatePayload(cert: Omit<Certificate, "hash">): string {
  return JSON.stringify([
    "SDGS-COMPASS-CERT/1",
    cert.id,
    cert.kind,
    cert.holder,
    canonical(cert.challengeTitle),
    canonical(cert.companyName),
    cert.award,
    cert.sdgIds,
    cert.points,
    cert.issuedOn,
  ]);
}

export function issueCertificate(input: Omit<Certificate, "hash">): Certificate {
  return { ...input, hash: sha256Hex(certificatePayload(input)) };
}

/** 내용을 다시 해시해서 저장된 해시와 같은지 확인해요 (다르면 위·변조) */
export function verifyCertificate(cert: Certificate): boolean {
  const { hash, ...rest } = cert;
  return sha256Hex(certificatePayload(rest)) === hash;
}

/** 눈으로 대조하기 쉬운 확인 코드: 해시 앞 12자리를 4자리씩 끊어 대문자로 */
export function verifyCode(hash: string): string {
  return (hash.slice(0, 12).toUpperCase().match(/.{1,4}/g) ?? []).join("-");
}

/** QR 에 넣는 문구 (휴대폰으로 읽으면 이 글자가 보여요) */
export function qrPayload(cert: Certificate): string {
  return `SDGS-COMPASS|${cert.id}|${cert.hash.slice(0, 32)}`;
}

/** 활동에서 증명서를 만들어요 (참가·제출 → 참가 증명서, 수상 → 수상 증명서). 공유 활동은 대상이 아니에요. */
export function certificateFromActivity(activity: Activity, holder: string, index: number): Certificate | null {
  if (activity.kind === "share") return null;
  return issueCertificate({
    id: `SC-C-${String(index + 1).padStart(4, "0")}`,
    kind: activity.kind === "award" ? "award" : "participation",
    holder,
    challengeTitle: activity.title,
    companyName: activity.companyName,
    award: activity.award ?? null,
    sdgIds: activity.sdgIds,
    points: activity.points,
    issuedOn: activity.date.slice(0, 10),
  });
}
