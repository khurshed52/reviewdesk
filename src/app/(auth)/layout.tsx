import { getCurrentUser } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  return <AuthShell>{children}</AuthShell>;
}
