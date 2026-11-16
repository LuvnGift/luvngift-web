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
import type { ItemCategoryIcon as AisleIcon } from '@luvngift/shared';

/**
 * One glyph per category icon key (ITEM_CATEGORY_ICONS in @luvngift/shared).
 * The Record over the shared type fails to compile when a key is added there
 * and has no glyph here.
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
