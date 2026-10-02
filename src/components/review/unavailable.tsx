"use client";
import { Result } from "antd";
export function ReviewUnavailable({ missing = false }: { missing?: boolean }) {
  return (
    <main className="public-shell">
      <Result
        status={missing ? "404" : "info"}
        title={
          missing ? "Review link not found" : "This review link is unavailable"
        }
        subTitle={
          missing
            ? "Check the link or ask the business for a new QR code."
            : "Please ask the business for an active review link."
        }
      />
    </main>
  );
}
