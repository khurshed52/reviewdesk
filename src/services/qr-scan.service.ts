import { prisma } from "@/lib/prisma";

// Call after resolving a valid, active public QR code. Each opening is a scan.
export async function recordQRScan(qrCodeId: string) {
  return prisma.qRScan.create({
    data: { qrCodeId },
  });
}
