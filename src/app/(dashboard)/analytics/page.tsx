import { requireMerchantUser } from "@/lib/permissions";
import { getAnalytics } from "@/services/analytics.service";
import { Overview } from "@/components/dashboard/overview";
export default async function Analytics() {
  await requireMerchantUser();
  return <Overview data={await getAnalytics()} analytics />;
}
