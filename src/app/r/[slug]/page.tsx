import { resolvePublicQR } from "@/services/qr.service";
import { recordQRScan } from "@/services/qr-scan.service";
import { ReviewForm } from "@/components/review/review-form";
import { ReviewUnavailable } from "@/components/review/unavailable";
import { slugSchema } from "@/lib/validations";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!slugSchema.safeParse(slug).success) {
    notFound();
  }

  const qr = await resolvePublicQR(slug);

  if (!qr) {
    notFound();
  }

  if (!qr.isActive) {
    return <ReviewUnavailable />;
  }

  await recordQRScan(qr.id);

  const business = qr.location.business;

  return (
  <ReviewForm
      slug={slug}
      business={business.name}
      location={qr.location.name}
      logoUrl={business.logoUrl}
      tags={business.category.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        icon: tag.icon,
      }))}
    />
  );
}
