import { getMerchant } from "@/services/merchant.service";
import { BusinessManager } from "@/components/businesses/business-manager";
import { PageHeading } from "@/components/common/page-heading";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const merchant = await getMerchant((await params).id);
  return (
    <>
      <PageHeading title={merchant.name} description={merchant.owner.email} />
      <BusinessManager
        rows={merchant.businesses.map((business) => ({
          ...business,
          category: business.category.name,
        }))}
        title="Merchant businesses"
        canCreate={false}
        readOnly
      />
    </>
  );
}
