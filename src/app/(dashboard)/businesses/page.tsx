import { requireMerchantUser } from "@/lib/permissions";
import { listBusinesses, listActiveBusinessCategories } from "@/services/business.service";
import { requireUser } from "@/lib/permissions";
import { BusinessManager } from "@/components/businesses/business-manager";
export default async function BusinessesPage() {
  await requireMerchantUser();
  const [rows, user, categories] = await Promise.all([listBusinesses(), requireUser(), listActiveBusinessCategories()]);
  return <BusinessManager rows={rows} categories={categories} canCreate={!!user.merchant} />;
}
