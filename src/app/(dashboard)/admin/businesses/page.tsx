import { requireAdmin } from "@/lib/permissions";
import { listBusinesses } from "@/services/business.service";
import { BusinessManager } from "@/components/businesses/business-manager";
export default async function Page() {
  await requireAdmin();
  return (
    <BusinessManager
      rows={await listBusinesses()}
      canCreate={false}
      readOnly
      title="All Businesses"
    />
  );
}
