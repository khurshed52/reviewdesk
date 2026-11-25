import {
  BedDouble, BookOpen, Car, ConciergeBell, Dumbbell, Heart,
  House, Utensils, Scissors, ShoppingBag, Sparkles, Stethoscope, Wrench,
  type LucideIcon,
} from "lucide-react";

type LoadingTheme = { Icon: LucideIcon; FeatureIcon?: LucideIcon; label: string };
const themes: Record<string, LoadingTheme> = {
  cafe: { Icon: ConciergeBell, FeatureIcon: Utensils, label: "Great food" },
  restaurant: { Icon: ConciergeBell, FeatureIcon: Utensils, label: "Great food" },
  salon: { Icon: Scissors, label: "Personal care" },
  clinic: { Icon: Stethoscope, label: "Thoughtful care" },
  gym: { Icon: Dumbbell, label: "Your fitness" },
  hotel: { Icon: BedDouble, label: "Your stay" },
  retail: { Icon: ShoppingBag, label: "Your shopping" },
  "car wash": { Icon: Sparkles, label: "Vehicle care" },
  "real estate": { Icon: House, label: "Your property journey" },
  "repair service": { Icon: Wrench, label: "Repair care" },
  "coaching & classes": { Icon: BookOpen, label: "Your learning" },
  "car & bike service": { Icon: Car, label: "Vehicle care" },
};
const neutral: LoadingTheme = { Icon: Heart, label: "Your experience" };

export function getReviewLoadingTheme(category?: string): LoadingTheme {
  return themes[category?.trim().toLowerCase() ?? ""] ?? neutral;
}
