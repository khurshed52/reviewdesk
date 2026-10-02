import "dotenv/config";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomBytes } from "node:crypto";
import { prisma } from "../../src/lib/prisma";
import {
  assertBusinessOwnership,
  assertLocationOwnership,
  assertQRCodeOwnership,
  businessScope,
  qrScope,
  type Actor,
} from "../../src/lib/permissions";
import { recordQRScan } from "../../src/services/qr-scan.service";
const ids: string[] = [];
const categoryIds: string[] = [];
after(async () => {
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
  await prisma.$disconnect();
});
test("ownership checks reject every cross-tenant resource and allow admins", async () => {
  const category = await prisma.category.create({
    data: {
      name: `Test ${randomBytes(6).toString("hex")}`,
      slug: randomBytes(8).toString("hex"),
    },
  });
  categoryIds.push(category.id);
  const user = await prisma.user.create({
    data: {
      email: `isolation-${randomBytes(6).toString("hex")}@example.test`,
      merchant: {
        create: {
          name: "Isolation test",
          businesses: {
            create: {
              name: "Private test business",
              category: { connect: { id: category.id } },
              locations: {
                create: {
                  name: "Private branch",
                  googleReviewUrl: "https://g.page/r/test/review",
                  qrCodes: {
                    create: { slug: randomBytes(12).toString("base64url") },
                  },
                },
              },
            },
          },
        },
      },
    },
    include: {
      merchant: {
        include: {
          businesses: {
            include: { locations: { include: { qrCodes: true } } },
          },
        },
      },
    },
  });
  ids.push(user.id);
  const merchant = user.merchant!;
  const business = merchant.businesses[0];
  const location = business.locations[0];
  const qr = location.qrCodes[0];
  const owner: Actor = {
    id: user.id,
    name: null,
    email: user.email,
    role: "MERCHANT",
    merchant: { id: merchant.id, name: merchant.name },
  };
  const stranger: Actor = {
    ...owner,
    id: "stranger",
    merchant: { id: "other-merchant", name: "Other" },
  };
  const admin: Actor = { ...owner, role: "ADMIN", merchant: null };
  assert.equal(
    (await assertBusinessOwnership(business.id, owner)).id,
    business.id,
  );
  for (const actor of [stranger, { ...stranger, merchant: null }]) {
    await assert.rejects(() => assertBusinessOwnership(business.id, actor));
    await assert.rejects(() => assertLocationOwnership(location.id, actor));
    await assert.rejects(() => assertQRCodeOwnership(qr.id, actor));
    assert.equal(
      await prisma.business.count({
        where: { id: business.id, ...businessScope(actor) },
      }),
      0,
    );
    assert.equal(
      await prisma.reviewSession.count({
        where: { qrCode: { id: qr.id, ...qrScope(actor) } },
      }),
      0,
    );
  }
  assert.equal(
    (await assertBusinessOwnership(business.id, admin)).id,
    business.id,
  );
  assert.equal(
    (await assertLocationOwnership(location.id, admin)).id,
    location.id,
  );
  assert.equal((await assertQRCodeOwnership(qr.id, admin)).id, qr.id);
  await recordQRScan(qr.id);
  await recordQRScan(qr.id);
  assert.equal(
    await prisma.reviewSession.count({ where: { qrCodeId: qr.id } }),
    0,
  );
  for (const [actor, expected] of [
    [owner, 2],
    [admin, 2],
    [stranger, 0],
    [{ ...stranger, merchant: null }, 0],
  ] as const) {
    assert.equal(
      await prisma.qRScan.count({
        where: { qrCode: { id: qr.id, ...qrScope(actor) } },
      }),
      expected,
    );
  }
  // Inactive QR rejection is handled by the public page and covered in E2E.
  await assert.rejects(() => recordQRScan("missing-qr"));
  assert.equal(await prisma.qRScan.count({ where: { qrCodeId: qr.id } }), 2);
  await prisma.reviewSession.create({
    data: { qrCodeId: qr.id, visitorKey: "test-visitor", rating: 4 },
  });
  await assert.rejects(() =>
    prisma.reviewSession.create({
      data: { qrCodeId: qr.id, visitorKey: "test-visitor", rating: 5 },
    }),
  );
  assert.equal(
    await prisma.reviewSession.count({
      where: { qrCode: { id: qr.id, ...qrScope(owner) } },
    }),
    1,
  );
  assert.equal(
    await prisma.reviewSession.count({
      where: { qrCode: { id: qr.id, ...qrScope(stranger) } },
    }),
    0,
  );
});
