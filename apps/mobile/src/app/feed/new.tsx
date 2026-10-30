import { RoleGuard } from "@/components/RoleGuard";
import { PostComposerScreen } from "@/screens/PostComposerScreen";

export default function NewPost() {
  return (
    <RoleGuard area="b2c">
      <PostComposerScreen kind="brag" />
    </RoleGuard>
  );
}
