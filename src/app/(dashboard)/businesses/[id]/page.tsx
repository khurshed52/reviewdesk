import { requireMerchantUser } from "@/lib/permissions";
import { getBusiness } from "@/services/business.service";
import { listLocations } from "@/services/location.service";
import { LocationManager } from "@/components/locations/location-manager";
import { PageHeading } from "@/components/common/page-heading";
export default async function BusinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMerchantUser();
  const { id } = await params;
  const business = await getBusiness(id);
  const rows = (await listLocations()).filter((l) => l.businessId === id);
  return (
    <>
      <PageHeading title={business.name} description={business.category} />
      <LocationManager rows={rows} businesses={[business]} />
    </>
  );
}
