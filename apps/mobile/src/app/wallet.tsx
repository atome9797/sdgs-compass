import { RoleGuard } from "@/components/RoleGuard";
import { WalletScreen } from "@/screens/WalletScreen";

/** #25 リワード残高(데모) — 학생 화면 */
export default function Wallet() {
  return (
    <RoleGuard area="b2c">
      <WalletScreen />
    </RoleGuard>
  );
}
