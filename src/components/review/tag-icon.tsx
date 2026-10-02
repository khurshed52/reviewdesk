import {
  Armchair,
  Clock3,
  Coffee,
  Grid2X2,
  Lamp,
  MapPin,
  MoreHorizontal,
  Sparkles,
  Tag,
  UserRound,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  food: Utensils,
  coffee: Coffee,
  user: UserRound,
  ambience: Lamp,
  sparkles: Sparkles,
  tag: Tag,
  location: MapPin,
  grid: Grid2X2,
  clock: Clock3,
  team: Users,
  chair: Armchair,
  more: MoreHorizontal,
};

export function ReviewTagIcon({
  icon,
  size = 25,
}: {
  icon: string | null;
  size?: number;
}) {
  const normalizedIcon = icon?.trim().toLowerCase();

  const Icon =
    normalizedIcon && iconMap[normalizedIcon]
      ? iconMap[normalizedIcon]
      : MoreHorizontal;

  return (
    <Icon
      size={size}
      strokeWidth={1.8}
      aria-hidden="true"
    />
  );
}