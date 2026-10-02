import { requireMerchantUser } from "@/lib/permissions";
import { getLocation, listLocations } from "@/services/location.service";
import { listQRCodes } from "@/services/qr.service";
import { QRManager } from "@/components/qr/qr-manager";
import { PageHeading } from "@/components/common/page-heading";
import { appOrigin } from "@/lib/utils";
export default async function LocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMerchantUser();
  const { id } = await params;
  const location = await getLocation(id);
  const [codes, locations] = await Promise.all([
    listQRCodes(),
    listLocations(),
  ]);
  return (
    <>
      <PageHeading
        title={location.name}
        description={location.address || "Manage this branch’s review links."}
      />
      <QRManager
        rows={codes.filter((q) => q.locationId === id)}
        locations={locations.filter((l) => l.id === id)}
        origin={appOrigin()}
      />
    </>
  );
}
