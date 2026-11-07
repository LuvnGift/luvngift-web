import {
  Baby,
  Carrot,
  Coffee,
  Cookie,
  Droplet,
  Drumstick,
  ShoppingBasket,
  SprayCan,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import type { AisleIcon } from '@/lib/box-aisles';

/**
 * One glyph per category icon key. The keys are the API's ITEM_CATEGORY_ICONS
 * (item-categories.validation.ts) and mobile's BoxPicker ICONS: change all three.
 */
export const AISLE_ICONS: Record<AisleIcon, LucideIcon> = {
  grains: Wheat,
  produce: Carrot,
  oils: Droplet,
  protein: Drumstick,
  drinks: Coffee,
  snacks: Cookie,
  household: SprayCan,
  baby: Baby,
  other: ShoppingBasket,
};

export const AISLE_ICON_LABELS: Record<AisleIcon, string> = {
  grains: 'Grains',
  produce: 'Produce',
  oils: 'Oils & spices',
  protein: 'Protein',
  drinks: 'Drinks',
  snacks: 'Snacks',
  household: 'Household',
  baby: 'Baby',
  other: 'Basket (general)',
};
