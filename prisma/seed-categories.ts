import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { seedCategoryCatalog } from "./category-catalog";

try {
  await prisma.$transaction(seedCategoryCatalog, { maxWait: 15000, timeout: 60000 });
  console.log("Category and tag defaults added; existing records preserved.");
} finally {
  await prisma.$disconnect();
}
