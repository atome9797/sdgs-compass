import { RoleGuard } from "@/components/RoleGuard";
import { CertificateScreen } from "@/screens/CertificateScreen";

export default function Certificate() {
  return (
    <RoleGuard area="b2c">
      <CertificateScreen />
    </RoleGuard>
  );
}
