import { requireMerchantUser } from "@/lib/permissions";
import { listBusinesses } from "@/services/business.service";
import { requireUser } from "@/lib/permissions";
import { BusinessManager } from "@/components/businesses/business-manager";
export default async function BusinessesPage() {
  await requireMerchantUser();
  const [rows, user] = await Promise.all([listBusinesses(), requireUser()]);
  return <BusinessManager rows={rows} canCreate={!!user.merchant} />;
}
