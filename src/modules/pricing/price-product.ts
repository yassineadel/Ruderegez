import type { Minor } from "@/lib/money";
import type { PricingSettings } from "@/lib/settings";
import type { Product, ProductSize } from "@/generated/prisma/client";
import { calculateitemprice } from "./calc";

/**
 * Turns a product row into a price.
 *
 * Pure - no database. Settings come in as a parameter, which is what makes
 * this unit-testable the way calc.ts is.
 */
export function priceProduct( product: Product, settings: PricingSettings, size: ProductSize | null = null,): Minor {
  // Kits and non-silver accessories bypass the formula entirely (FR-84).
  if (product.isFlatPrice) {
    if (product.flatPriceMinor === null) {
      throw new Error("PRODUCT_MISCONFIGURED");
    }
    return product.flatPriceMinor as Minor;
  }

  // A size may override the product's weight; null means "use the product's".
  const weightMg = size?.weightMg ?? product.weightMg;

  return calculateitemprice(
    weightMg,
    product.factorBp,
    settings.silverRatePerGram,
    settings.weightTolerancePercent,
  );
}