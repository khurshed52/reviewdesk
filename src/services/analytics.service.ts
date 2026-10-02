import "server-only";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  businessScope,
  locationScope,
  qrScope,
} from "@/lib/permissions";
export async function getAnalytics() {
  const user = await requireUser();
  const scope = qrScope(user);
  const [
    businesses,
    locations,
    qrCodes,
    scans,
    sessions,
    clicks,
    recent,
    top,
    recentBusinesses,
    ratings,
    generated,
    selected,
    topQRCodes,
    confirmed,
  ] = await prisma.$transaction(
    [
      prisma.business.count({ where: businessScope(user) }),
      prisma.location.count({ where: locationScope(user) }),
      prisma.qRCode.count({ where: scope }),
      prisma.qRScan.count({ where: { qrCode: scope } }),
      prisma.reviewSession.count({ where: { qrCode: scope } }),
      prisma.reviewSession.count({
        where: { qrCode: scope, clickedGoogle: true },
      }),
      prisma.reviewSession.findMany({
        where: { qrCode: scope },
        select: {
          id: true,
          rating: true,
          clickedGoogle: true,
          status: true,
          createdAt: true,
          qrCode: {
            select: {
              name: true,
              slug: true,
              source: true,
              location: {
                select: { name: true, business: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.location.findMany({
        where: locationScope(user),
        select: {
          id: true,
          name: true,
          business: { select: { name: true } },
          qrCodes: { select: { _count: { select: { scans: true } } } },
        },
      }),
      prisma.business.findMany({
        where: businessScope(user),
        select: {
          id: true,
          name: true,
          category: true,
          _count: { select: { locations: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      prisma.reviewSession.count({
        where: { qrCode: scope, rating: { not: null } },
      }),
      prisma.reviewSession.count({
        where: {
          qrCode: scope,
          status: { in: ["REVIEW_GENERATED", "GOOGLE_CLICKED"] },
        },
      }),
      prisma.reviewSession.count({
        where: {
          qrCode: scope,
          reviewText: { not: null },
          NOT: { reviewText: "" },
        },
      }),
      prisma.qRCode.findMany({
        where: scope,
        select: {
          id: true,
          name: true,
          slug: true,
          location: {
            select: { name: true, business: { select: { name: true } } },
          },
          _count: { select: { scans: true } },
        },
        orderBy: [{ scans: { _count: "desc" } }, { id: "asc" }],
        take: 5,
      }),
      prisma.reviewSession.count({
        where: { qrCode: scope, confirmedPostedAt: { not: null } },
      }),
    ],
    { isolationLevel: "RepeatableRead" },
  );
  return {
    businesses,
    locations,
    qrCodes,
    scans,
    sessions,
    clicks,
    ratings,
    generated,
    selected,
    confirmed,
    confirmedConversion: {
      scan: percentage(confirmed, scans),
      googleClick: percentage(confirmed, clicks),
    },
    funnel: {
      scanToRating: percentage(ratings, scans),
      ratingToGenerated: percentage(generated, ratings),
      generatedToSelected: percentage(selected, generated),
      selectedToGoogle: percentage(clicks, selected),
      scanToGoogle: percentage(clicks, scans),
    },
    topQRCodes,
    conversion: sessions ? (clicks / sessions) * 100 : 0,
    recent,
    recentBusinesses,
    topLocations: top
      .map((l) => ({
        id: l.id,
        name: l.name,
        business: l.business.name,
        scans: l.qrCodes.reduce((sum, q) => sum + q._count.scans, 0),
      }))
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 5),
  };
}

function percentage(numerator: number, denominator: number) {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}
