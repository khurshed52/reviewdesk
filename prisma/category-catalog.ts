import type { Prisma } from "../src/generated/prisma/client";

export const categoryCatalog = [
  {
    "name": "Cafe",
    "slug": "cafe",
    "tags": [
      {
        "name": "Food",
        "slug": "food",
        "icon": "food"
      },
      {
        "name": "Drinks",
        "slug": "drinks",
        "icon": "coffee"
      },
      {
        "name": "Service",
        "slug": "service",
        "icon": "user"
      },
      {
        "name": "Ambience",
        "slug": "ambience",
        "icon": "ambience"
      },
      {
        "name": "Cleanliness",
        "slug": "cleanliness",
        "icon": "sparkles"
      },
      {
        "name": "Price",
        "slug": "price",
        "icon": "tag"
      },
      {
        "name": "Location",
        "slug": "location",
        "icon": "location"
      },
      {
        "name": "Variety",
        "slug": "variety",
        "icon": "grid"
      },
      {
        "name": "Speed",
        "slug": "speed",
        "icon": "clock"
      },
      {
        "name": "Friendly Staff",
        "slug": "friendly-staff",
        "icon": "team"
      },
      {
        "name": "Seating",
        "slug": "seating",
        "icon": "chair"
      },
      {
        "name": "Other",
        "slug": "other",
        "icon": "more"
      }
    ]
  },
  {
    "name": "Restaurant",
    "slug": "restaurant",
    "tags": [
      {
        "name": "Food",
        "slug": "food",
        "icon": "food"
      },
      {
        "name": "Menu Variety",
        "slug": "menu-variety",
        "icon": "grid"
      },
      {
        "name": "Service",
        "slug": "service",
        "icon": "user"
      },
      {
        "name": "Ambience",
        "slug": "ambience",
        "icon": "ambience"
      },
      {
        "name": "Cleanliness",
        "slug": "cleanliness",
        "icon": "sparkles"
      },
      {
        "name": "Value",
        "slug": "value",
        "icon": "tag"
      },
      {
        "name": "Wait Time",
        "slug": "wait-time",
        "icon": "clock"
      },
      {
        "name": "Other",
        "slug": "other",
        "icon": "more"
      }
    ]
  },
  {
    "name": "Salon",
    "slug": "salon",
    "tags": [
      {
        "name": "Haircut",
        "slug": "haircut",
        "icon": "scissors"
      },
      {
        "name": "Styling",
        "slug": "styling",
        "icon": "scissors"
      },
      {
        "name": "Consultation",
        "slug": "consultation",
        "icon": "user"
      },
      {
        "name": "Staff",
        "slug": "staff",
        "icon": "team"
      },
      {
        "name": "Hygiene",
        "slug": "hygiene",
        "icon": "sparkles"
      },
      {
        "name": "Ambience",
        "slug": "ambience",
        "icon": "ambience"
      },
      {
        "name": "Value",
        "slug": "value",
        "icon": "tag"
      },
      {
        "name": "Appointment Timing",
        "slug": "appointment-timing",
        "icon": "clock"
      },
      {
        "name": "Other",
        "slug": "other",
        "icon": "more"
      }
    ]
  },
  {
    "name": "Clinic",
    "slug": "clinic",
    "tags": [
      {
        "name": "Consultation",
        "slug": "consultation",
        "icon": "stethoscope"
      },
      {
        "name": "Communication",
        "slug": "communication",
        "icon": "user"
      },
      {
        "name": "Staff",
        "slug": "staff",
        "icon": "team"
      },
      {
        "name": "Cleanliness",
        "slug": "cleanliness",
        "icon": "sparkles"
      },
      {
        "name": "Comfort",
        "slug": "comfort",
        "icon": "chair"
      },
      {
        "name": "Wait Time",
        "slug": "wait-time",
        "icon": "clock"
      },
      {
        "name": "Location",
        "slug": "location",
        "icon": "location"
      },
      {
        "name": "Other",
        "slug": "other",
        "icon": "more"
      }
    ]
  },
  {
    "name": "Gym",
    "slug": "gym",
    "tags": [
      {
        "name": "Equipment",
        "slug": "equipment",
        "icon": "dumbbell"
      },
      {
        "name": "Trainers",
        "slug": "trainers",
        "icon": "team"
      },
      {
        "name": "Classes",
        "slug": "classes",
        "icon": "grid"
      },
      {
        "name": "Cleanliness",
        "slug": "cleanliness",
        "icon": "sparkles"
      },
      {
        "name": "Atmosphere",
        "slug": "atmosphere",
        "icon": "ambience"
      },
      {
        "name": "Value",
        "slug": "value",
        "icon": "tag"
      },
      {
        "name": "Facilities",
        "slug": "facilities",
        "icon": "chair"
      },
      {
        "name": "Other",
        "slug": "other",
        "icon": "more"
      }
    ]
  },
  {
    "name": "Hotel",
    "slug": "hotel",
    "tags": [
      {
        "name": "Room",
        "slug": "room",
        "icon": "bed"
      },
      {
        "name": "Comfort",
        "slug": "comfort",
        "icon": "chair"
      },
      {
        "name": "Cleanliness",
        "slug": "cleanliness",
        "icon": "sparkles"
      },
      {
        "name": "Staff",
        "slug": "staff",
        "icon": "team"
      },
      {
        "name": "Facilities",
        "slug": "facilities",
        "icon": "grid"
      },
      {
        "name": "Check-in",
        "slug": "check-in",
        "icon": "clock"
      },
      {
        "name": "Location",
        "slug": "location",
        "icon": "location"
      },
      {
        "name": "Value",
        "slug": "value",
        "icon": "tag"
      },
      {
        "name": "Other",
        "slug": "other",
        "icon": "more"
      }
    ]
  },
  {
    "name": "Retail",
    "slug": "retail",
    "tags": [
      {
        "name": "Product Selection",
        "slug": "product-selection",
        "icon": "grid"
      },
      {
        "name": "Product Quality",
        "slug": "product-quality",
        "icon": "tag"
      },
      {
        "name": "Staff",
        "slug": "staff",
        "icon": "team"
      },
      {
        "name": "Service",
        "slug": "service",
        "icon": "user"
      },
      {
        "name": "Store Layout",
        "slug": "store-layout",
        "icon": "location"
      },
      {
        "name": "Value",
        "slug": "value",
        "icon": "tag"
      },
      {
        "name": "Checkout",
        "slug": "checkout",
        "icon": "clock"
      },
      {
        "name": "Other",
        "slug": "other",
        "icon": "more"
      }
    ]
  },
  {
    "name": "Car Wash",
    "slug": "car-wash",
    "tags": [
      {
        "name": "Cleaning",
        "slug": "cleaning",
        "icon": "sparkles"
      },
      {
        "name": "Attention to Detail",
        "slug": "attention-to-detail",
        "icon": "car"
      },
      {
        "name": "Service",
        "slug": "service",
        "icon": "user"
      },
      {
        "name": "Staff",
        "slug": "staff",
        "icon": "team"
      },
      {
        "name": "Speed",
        "slug": "speed",
        "icon": "clock"
      },
      {
        "name": "Value",
        "slug": "value",
        "icon": "tag"
      },
      {
        "name": "Other",
        "slug": "other",
        "icon": "more"
      }
    ]
  },
  {
    "name": "Real Estate",
    "slug": "real-estate",
    "tags": [
      {
        "name": "Communication",
        "slug": "communication",
        "icon": "user"
      },
      {
        "name": "Property Options",
        "slug": "property-options",
        "icon": "grid"
      },
      {
        "name": "Guidance",
        "slug": "guidance",
        "icon": "team"
      },
      {
        "name": "Professionalism",
        "slug": "professionalism",
        "icon": "user"
      },
      {
        "name": "Responsiveness",
        "slug": "responsiveness",
        "icon": "clock"
      },
      {
        "name": "Other",
        "slug": "other",
        "icon": "more"
      }
    ]
  },
  {
    "name": "Repair Service",
    "slug": "repair-service",
    "tags": [
      {
        "name": "Repair Work",
        "slug": "repair-work",
        "icon": "wrench"
      },
      {
        "name": "Communication",
        "slug": "communication",
        "icon": "user"
      },
      {
        "name": "Staff",
        "slug": "staff",
        "icon": "team"
      },
      {
        "name": "Turnaround Time",
        "slug": "turnaround-time",
        "icon": "clock"
      },
      {
        "name": "Value",
        "slug": "value",
        "icon": "tag"
      },
      {
        "name": "Other",
        "slug": "other",
        "icon": "more"
      }
    ]
  },
  {
    "name": "Coaching & Classes",
    "slug": "coaching-and-classes",
    "tags": [
      {
        "name": "Teaching",
        "slug": "teaching",
        "icon": "book"
      },
      {
        "name": "Explanation",
        "slug": "explanation",
        "icon": "user"
      },
      {
        "name": "Course Content",
        "slug": "course-content",
        "icon": "book"
      },
      {
        "name": "Support",
        "slug": "support",
        "icon": "team"
      },
      {
        "name": "Facilities",
        "slug": "facilities",
        "icon": "chair"
      },
      {
        "name": "Scheduling",
        "slug": "scheduling",
        "icon": "clock"
      },
      {
        "name": "Value",
        "slug": "value",
        "icon": "tag"
      },
      {
        "name": "Other",
        "slug": "other",
        "icon": "more"
      }
    ]
  },
  {
    "name": "Car & Bike Service",
    "slug": "car-and-bike-service",
    "tags": [
      {
        "name": "Service Work",
        "slug": "service-work",
        "icon": "wrench"
      },
      {
        "name": "Communication",
        "slug": "communication",
        "icon": "user"
      },
      {
        "name": "Staff",
        "slug": "staff",
        "icon": "team"
      },
      {
        "name": "Turnaround Time",
        "slug": "turnaround-time",
        "icon": "clock"
      },
      {
        "name": "Value",
        "slug": "value",
        "icon": "tag"
      },
      {
        "name": "Facilities",
        "slug": "facilities",
        "icon": "car"
      },
      {
        "name": "Other",
        "slug": "other",
        "icon": "more"
      }
    ]
  },
  {
    "name": "Other",
    "slug": "other",
    "tags": [
      {
        "name": "Service",
        "slug": "service",
        "icon": "user"
      },
      {
        "name": "Staff",
        "slug": "staff",
        "icon": "team"
      },
      {
        "name": "Communication",
        "slug": "communication",
        "icon": "user"
      },
      {
        "name": "Value",
        "slug": "value",
        "icon": "tag"
      },
      {
        "name": "Location",
        "slug": "location",
        "icon": "location"
      },
      {
        "name": "Other",
        "slug": "other",
        "icon": "more"
      }
    ]
  }
];

export async function seedCategoryCatalog(tx: Prisma.TransactionClient) {
  for (const [index, entry] of categoryCatalog.entries()) {
    const category = await tx.category.upsert({
      where: { name: entry.name },
      update: {},
      create: { name: entry.name, slug: entry.slug, sortOrder: index + 1 },
    });
    await tx.reviewTag.createMany({
      data: entry.tags.map((tag, index) => ({ ...tag, categoryId: category.id, sortOrder: index + 1 })),
      skipDuplicates: true,
    });
  }
}
