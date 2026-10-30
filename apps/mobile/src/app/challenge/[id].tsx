import { RoleGuard } from "@/components/RoleGuard";
import { ChallengeScreen } from "@/screens/ChallengeScreen";

export default function Challenge() {
  return (
    <RoleGuard area="b2c">
      <ChallengeScreen />
    </RoleGuard>
  );
}
