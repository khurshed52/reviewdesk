import assert from "node:assert/strict";
import { mock, test } from "node:test";

await mock.module("next/navigation", { namedExports: { notFound: () => { throw new Error("Not found"); } } });
let active = true;
await mock.module("../../src/lib/permissions.ts", {
  namedExports: {
    requireUser: async () => ({ id: "owner" }),
    requireMerchant: async () => ({ id: "merchant" }),
    requireMerchantUser: async () => ({ id: "owner" }),
    businessScope: () => ({ merchantId: "merchant" }),
    assertBusinessOwnership: async () => {},
  },
});
await mock.module("../../src/lib/prisma.ts", {
  namedExports: {
    prisma: {
      category: {
        findFirst: async ({ where }: { where: { name: string; isActive: boolean } }) => {
          assert.equal(where.name, "Salon");
          assert.equal(where.isActive, true);
          return active ? { id: "salon-id" } : null;
        },
        findMany: async ({ where }: { where: { isActive: boolean } }) => {
          assert.equal(where.isActive, true);
          return [{ name: "Salon" }];
        },
      },
      business: {
        create: async ({ data }: { data: Record<string, unknown> }) => data,
      },
    },
  },
});
const { createBusiness, listActiveBusinessCategories } = await import("../../src/services/business.service");
test("business creation uses active database categories and keeps merchant ownership", async () => {
  assert.deepEqual(await listActiveBusinessCategories(), [{ name: "Salon" }]);
  const business = await createBusiness({ name: "My Salon", category: "Salon", merchantId: "forged" });
  assert.equal(business.categoryId, "salon-id");
  assert.equal(business.merchantId, "merchant");
  active = false;
  await assert.rejects(() => createBusiness({ name: "My Salon", category: "Salon" }), /unavailable/);
});
