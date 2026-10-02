import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AppProvider } from "@/providers/app-provider";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Reviewdesk", template: "%s · Reviewdesk" },
  description:
    "Manage your businesses, collect feedback, and connect customers to Google Reviews.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <AppProvider>{children}</AppProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
