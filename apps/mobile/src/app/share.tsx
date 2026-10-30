import { RoleGuard } from "@/components/RoleGuard";
import { ShareScreen } from "@/screens/ShareScreen";

export default function Share() {
  return (
    <RoleGuard area="b2c">
      <ShareScreen />
    </RoleGuard>
  );
}
