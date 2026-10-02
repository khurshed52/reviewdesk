import { requireUser } from "@/lib/permissions";
import { getAnalytics } from "@/services/analytics.service";
import { Overview } from "@/components/dashboard/overview";
export default async function Dashboard() {
  const user = await requireUser();
  return (
    <Overview data={await getAnalytics()} isAdmin={user.role === "ADMIN"} />
  );
}
