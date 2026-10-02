import { requireMerchantUser } from "@/lib/permissions";
import { listLocations } from "@/services/location.service";
import { listBusinesses } from "@/services/business.service";
import { LocationManager } from "@/components/locations/location-manager";
export default async function LocationsPage() {
  await requireMerchantUser();
  const [rows, businesses] = await Promise.all([
    listLocations(),
    listBusinesses(),
  ]);
  return <LocationManager rows={rows} businesses={businesses} />;
}
