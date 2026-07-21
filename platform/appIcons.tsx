/**
 * PLATFORM LAYER - icon rendering for registry entries.
 * Registry rows store an icon key; this maps keys to lucide-react icons so
 * both server and client components render the same professional icon set.
 */
import { Flag, IdCard, LayoutGrid, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "id-card": IdCard,
  flag: Flag,
};

export function AppIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? LayoutGrid;
  return <Icon className={className} aria-hidden="true" />;
}
