import { requireMerchantUser } from "@/lib/permissions";
import { listQRCodes } from "@/services/qr.service";
import { listLocations } from "@/services/location.service";
import { QRManager } from "@/components/qr/qr-manager";
import { appOrigin } from "@/lib/utils";
export default async function QRCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string }>;
}) {
  await requireMerchantUser();
  const [rows, locations, query] = await Promise.all([
    listQRCodes(),
    listLocations(),
    searchParams,
  ]);
  return (
    <QRManager
      rows={rows}
      locations={locations}
      origin={appOrigin()}
      initialLocation={query.locationId}
    />
  );
}
