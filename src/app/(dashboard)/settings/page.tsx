import { requireUser } from "@/lib/permissions";
import { Account } from "@/components/settings/account";
export default async function SettingsPage() {
  return <Account user={await requireUser()} />;
}
