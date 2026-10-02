import { listMerchants } from "@/services/merchant.service";
import { Merchants } from "@/components/admin/merchants";
export default async function Page() {
  return <Merchants rows={await listMerchants()} />;
}
