import { RoleGuard } from "@/components/RoleGuard";
import { SubmitScreen } from "@/screens/SubmitScreen";

export default function Submit() {
  return (
    <RoleGuard area="b2c">
      <SubmitScreen />
    </RoleGuard>
  );
}
