import type { Minor } from "@/lib/money";
import { getPricingSettings } from "@/lib/settings";
import { priceProduct } from "@/modules/pricing/price-product";
import { prisma } from "@/lib/db";
import { createHash } from "crypto";
import { findCurrentCart, getOrCreateCart } from "./cart-identity";
import {
  findCartWithItems,
  countCartItems,
  upsertCartItem,
  updateCartItemQuantity,
  deleteCartItem,
  type CartWithItems,
} from "./repository";

export interface CartLine {
  id: string;
  productId: string;
  slug: string;
  name: string;
  typeName: string;
  imageUrl: string | null;
  size: string;
  quantity: number;
  unitPriceMinor: Minor;
  lineTotalMinor: Minor;
  priceChanged: boolean;
  /** True for an accepted quote - no product, price frozen, quantity fixed. */
  isCustom: boolean;
}

export interface CartView {
  lines: CartLine[];
  itemCount: number;
  subtotalMinor: Minor;
}

const EMPTY: CartView = { lines: [], itemCount: 0, subtotalMinor: 0 as Minor };

/**
 * Prices are recomputed live from the current silver rate, NOT read from
 * `unitPriceMinor` - that column is a snapshot of what the customer saw when
 * they added the item. When the two differ the line is flagged so checkout
 * can say so (BRD 5.5).
 */
export async function getCartView(
  options: {
    /** Price at this rate instead of the live one - checkout's price hold. */
    silverRateOverride?: Minor;
  } = {},
): Promise<CartView> {
  const cart = await findCurrentCart();
  if (!cart) return EMPTY;

  const [full, liveSettings] = await Promise.all([
    findCartWithItems(cart.id),
    getPricingSettings(),
  ]);
  if (!full || full.items.length === 0) return EMPTY;

  const settings = options.silverRateOverride
    ? { ...liveSettings, silverRatePerGram: options.silverRateOverride }
    : liveSettings;

  const lines: CartLine[] = [];

    for (const item of full.items) {
    // ---- accepted quote: price is FROZEN at what was quoted --------------
    if (item.kind === "CUSTOM_QUOTE" && item.customRequest) {
      const cr = item.customRequest;
      lines.push({
        isCustom: true,
        id: item.id,
        productId: "",
        slug: `custom/${cr.reference}`,
        name: `Custom piece - ${cr.reference}`,
        typeName: "MADE TO ORDER",
        imageUrl: cr.images[0]?.url ?? null,
        size: cr.requestedSize ?? "",
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor as Minor,
        lineTotalMinor: (item.unitPriceMinor * item.quantity) as Minor,
        // A quoted price never "changes" - that is the point of quoting.
        priceChanged: false,
      });
      continue;
    }

    // ---- catalog item: recompute from the live rate ----------------------
    if (!item.product) continue;

    const size = item.size
      ? (item.product.sizes.find((s) => s.label === item.size) ?? null)
      : null;

    const live = priceProduct(item.product, settings, size);

    lines.push({
           isCustom: false,
      id: item.id,
      productId: item.product.id,
      slug: item.product.slug,
      name: item.product.name,
      typeName: item.product.type.name,
      imageUrl: item.product.images[0]?.url ?? null,
      size: item.size ?? "",
      quantity: item.quantity,
      unitPriceMinor: live,
      lineTotalMinor: (live * item.quantity) as Minor,
      priceChanged: live !== item.unitPriceMinor,
    });
  }

  return {
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotalMinor: lines.reduce((n, l) => n + l.lineTotalMinor, 0) as Minor,
  };
}


/**
 * A fingerprint of WHAT is in the bag - lines and quantities, not prices.
 * Checkout's price hold is tied to it: change the bag and the hold is void.
 */
export function cartSignature(view: CartView): string {
  const parts = view.lines.map((l) => `${l.id}:${l.quantity}`).sort();
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

/** Just the number for the header badge. */
export async function getCartCount(): Promise<number> {
  const cart = await findCurrentCart();
  if (!cart) return 0;
  return countCartItems(cart.id);
}

export async function addToCart(input: {
  productId: string;
  size?: string;
  quantity?: number;
}): Promise<void> {
  const quantity = input.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    throw new Error("INVALID_QUANTITY");
  }

  const product = await prisma.product.findFirst({
    where: { id: input.productId, isHidden: false, deletedAt: null },
    include: { sizes: true },
  });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  // A product with sizes must have one chosen; one without must not.
  let size = "";
  if (product.sizes.length > 0) {
    if (!input.size) throw new Error("SIZE_REQUIRED");
    const match = product.sizes.find((s) => s.label === input.size);
    if (!match) throw new Error("INVALID_SIZE");
    size = match.label;
  }

  const settings = await getPricingSettings();
  const chosen = size ? product.sizes.find((s) => s.label === size)! : null;
  const unitPriceMinor = priceProduct(product, settings, chosen);

  const cart = await getOrCreateCart();

  await upsertCartItem({
    cartId: cart.id,
    productId: product.id,
    size,
    quantity,
    unitPriceMinor,
  });
}

export async function setQuantity(itemId: string, quantity: number): Promise<void> {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 20) {
    throw new Error("INVALID_QUANTITY");
  }

  const cart = await findCurrentCart();
  if (!cart) throw new Error("NO_CART");

  if (quantity === 0) {
    await deleteCartItem(itemId, cart.id);
    return;
  }

  const result = await updateCartItemQuantity(itemId, cart.id, quantity);
  if (result.count === 0) throw new Error("ITEM_NOT_FOUND");
}

export async function removeFromCart(itemId: string): Promise<void> {
  const cart = await findCurrentCart();
  if (!cart) throw new Error("NO_CART");

  const result = await deleteCartItem(itemId, cart.id);
  if (result.count === 0) throw new Error("ITEM_NOT_FOUND");
}

export type { CartWithItems };