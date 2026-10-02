import { z } from "zod";
export const categories = [
  "Cafe",
  "Restaurant",
  "Salon",
  "Clinic",
  "Gym",
  "Hotel",
  "Retail",
  "Car Wash",
  "Real Estate",
  "Repair Service",
  "Other",
] as const;
export const sources = [
  "COUNTER",
  "TABLE",
  "RECEIPT",
  "WHATSAPP",
  "MENU",
  "ENTRANCE",
  "OTHER",
] as const;
const name = z.string().trim().min(2).max(120);
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254));
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "Password must be at most 72 UTF-8 bytes",
  );
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});
export const registrationSchema = z
  .object({
    name,
    companyName: name,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
const httpsUrl = z
  .url()
  .max(2048)
  .refine((v) => {
    if (!URL.canParse(v)) return false;
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password;
  }, "Use a secure HTTPS URL");
export const googleReviewUrlSchema = httpsUrl.refine((v) => {
  if (!URL.canParse(v)) return false;
  const u = new URL(v);
  if (u.port && u.port !== "443") return false;
  if (u.hostname === "g.page") return /^\/[A-Za-z0-9_/-]+$/.test(u.pathname);
  if (u.hostname === "maps.app.goo.gl")
    return /^\/[A-Za-z0-9]+$/.test(u.pathname);
  if (u.hostname === "search.google.com")
    return (
      u.pathname === "/local/writereview" && !!u.searchParams.get("placeid")
    );
  if (u.hostname === "maps.google.com")
    return u.pathname === "/" || u.pathname.startsWith("/maps");
  return (
    ["google.com", "www.google.com"].includes(u.hostname) &&
    (u.pathname === "/maps" || u.pathname.startsWith("/maps/"))
  );
}, "Enter a Google Maps or Google Review URL");
export const businessCreateSchema = z.object({
  name,
  category: z.enum(categories),
  logoUrl: z
    .union([httpsUrl, z.literal("")])
    .optional()
    .transform((v) => v || null),
});
export const businessUpdateSchema = businessCreateSchema;
export const locationCreateSchema = z.object({
  businessId: z.string().cuid(),
  name,
  address: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || null),
  googleReviewUrl: googleReviewUrlSchema,
});
export const locationUpdateSchema = locationCreateSchema;
export const qrCreateSchema = z.object({
  locationId: z.string().cuid(),
  name: z.string().trim().max(120).optional(),
  source: z.enum(sources),
});
export const qrStatusSchema = z.object({
  id: z.string().cuid(),
  isActive: z.boolean(),
});
export const idSchema = z.string().cuid();
export const reviewSchema = z.object({
  slug: z.string().regex(/^[A-Za-z0-9_-]{16}$/),
  rating: z.number().int().min(1).max(5),
});
export const slugSchema = reviewSchema.shape.slug;

export const reviewTagsSchema = z.object({
  slug: slugSchema,
  selectedTags: z
    .array(z.string().cuid())
    .min(1)
    .max(3)
    .refine((ids) => new Set(ids).size === ids.length, "Select distinct tags"),
});

export const finalReviewSchema = z.object({
  slug: slugSchema,
  reviewText: z
    .string()
    .trim()
    .min(1, "Please enter your review.")
    .max(4000, "Keep your review under 4,000 characters."),
});

export const confirmReviewPostedSchema = z.object({ slug: slugSchema });
