import { requireUser } from "@/lib/permissions";
import { DashboardShell } from "@/components/layout/dashboard-shell";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <DashboardShell user={user}>
      {user.role === "MERCHANT" && !user.merchant ? (
        <section className="rounded-2xl bg-white p-6" role="status">
          <h1 className="text-2xl font-semibold">
            Your merchant workspace is unavailable
          </h1>
          <p className="mt-3">
            Your account is signed in, but it has no merchant workspace. Please
            contact an administrator to restore access.
          </p>
        </section>
      ) : (
        children
      )}
    </DashboardShell>
  );
}
