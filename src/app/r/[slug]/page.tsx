import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { ReviewLoading } from "./review-loading";
import { notFound } from "next/navigation";
import { after } from "next/server";

import { resolvePublicQR } from "@/services/qr.service";
import { recordQRScan } from "@/services/qr-scan.service";


import { ReviewForm } from "@/components/review/review-form";
import { ReviewUnavailable } from "@/components/review/unavailable";

import { slugSchema } from "@/lib/validations";

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

  after(async () => {
    try {
      await recordQRScan(qr.id);
    } catch (error) {
      console.error("Failed to record QR scan", error);
    }
  });

  return (
    <Suspense fallback={<ReviewLoading category={qr.location.business.category.name} />}>
      <ResolvedReviewPage slug={slug} qr={qr} />
    </Suspense>
  );
}

async function ResolvedReviewPage({ slug, qr }: {
  slug: string;
  qr: NonNullable<Awaited<ReturnType<typeof resolvePublicQR>>>;
}) {
  // A new document starts a new visit; returning from Google keeps the mounted form.
  const visitId = randomUUID();
  const business = qr.location.business;

  return (
    <ReviewForm
      key={slug}
      visitId={visitId}
      slug={slug}
      business={business.name}
      category={business.category.name}
      location={qr.location.name}
      logoUrl={business.logoUrl}
      initialReviewState="NEW"
      existingGoogleReviewUrl={null}
      initialReviewText={null}
      tags={business.category.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        icon: tag.icon,
      }))}
    />
  );
}
