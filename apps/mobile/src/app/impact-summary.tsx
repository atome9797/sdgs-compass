import { RoleGuard } from "@/components/RoleGuard";
import { ApplicationSummaryScreen } from "@/screens/ApplicationSummaryScreen";

export default function ImpactSummary() {
  return (
    <RoleGuard area="b2c">
      <ApplicationSummaryScreen />
    </RoleGuard>
  );
}
