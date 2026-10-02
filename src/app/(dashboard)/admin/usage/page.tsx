import { requireAdmin } from "@/lib/permissions";
import { getAnalytics } from "@/services/analytics.service";
import { Overview } from "@/components/dashboard/overview";
export default async function Page() {
  await requireAdmin();
  return <Overview data={await getAnalytics()} analytics isAdmin />;
}
