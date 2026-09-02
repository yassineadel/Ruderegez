import type { Minor } from "@/lib/money";
import { getPricingSettings } from "@/lib/settings";
import { requireUser } from "@/lib/auth-guards";
import { getCartView } from "@/modules/cart/service";
import { findCurrentCart } from "@/modules/cart/cart-identity";
import { prisma } from "@/lib/db";
import type { PaymentMethod } from "@/generated/prisma/client";
import { generateOrderReference } from "./reference";
import { createOrderTransaction, referenceExists } from "./repository";

export interface PlaceOrderInput {
  customerName: string;
  customerPhone: string;
  addressLine: string;
  addressCity: string;
  addressNotes?: string;
  paymentMethod: PaymentMethod;
  /** The total the customer was shown. If it no longer matches, we stop. */
  expectedTotalMinor: number;
}

/**
 * Creates an order from the current cart.
 *
 * The prices used are the ones the CUSTOMER WAS JUST SHOWN — getCartView
 * computes them from the live rate, and the cart page rendered from exactly
 * this. `expectedTotalMinor` guards the seconds between page load and submit:
 * if the rate moved in that window we stop and make them confirm rather than
 * charging a number they never saw.
 *
 * Everything is then FROZEN. The rate, the weights, the factors, and the
 * deposit percent are all snapshotted, so this order can be recomputed and
 * defended months from now even if the product is edited or deleted.
 */
export async function placeOrder(input: PlaceOrderInput) {
  const user = await requireUser();

  const [cart, cartRow, settings] = await Promise.all([
    getCartView(),
    findCurrentCart(),
    getPricingSettings(),
  ]);

  if (!cartRow || cart.lines.length === 0) throw new Error("EMPTY_CART");

  // --- validate the customer details --------------------------------------
  if (input.customerName.trim().length < 2) throw new Error("INVALID_ADDRESS");
  if (input.addressLine.trim().length < 6) throw new Error("INVALID_ADDRESS");

  // Egyptian mobile: 01 followed by 0, 1, 2 or 5, then eight digits.
  const phone = input.customerPhone.replace(/[\s-]/g, "");
  if (!/^01[0125]\d{8}$/.test(phone)) throw new Error("INVALID_PHONE");

  // --- money ---------------------------------------------------------------
  const subtotalMinor = cart.subtotalMinor;
  const deliveryFeeMinor = settings.deliveryFee;
  const totalMinor = subtotalMinor + deliveryFeeMinor;

  // The rate moved between render and submit.
  if (totalMinor !== input.expectedTotalMinor) {
    throw new Error("PRICE_MOVED");
  }

  const depositPercent = settings.depositPercent;
  const depositDueMinor =
    input.paymentMethod === "FULL_INSTAPAY"
      ? totalMinor
      : Math.round((totalMinor * depositPercent) / 100);
  const balanceDueMinor = totalMinor - depositDueMinor;

  // --- snapshot every line -------------------------------------------------
  const products = await prisma.product.findMany({
    where: { id: { in: cart.lines.map((l) => l.productId) } },
    include: { sizes: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const items = cart.lines.map((line) => {
    const product = byId.get(line.productId);
    const size = product?.sizes.find((s) => s.label === line.size);

    return {
      kind: "CATALOG" as const,
      productId: line.productId,

      nameSnapshot: line.name,
      imageUrlSnapshot: line.imageUrl,
      sizeSnapshot: line.size || null,

      // The INPUTS, not just the answer — so any line can be recomputed and
      // explained to a customer months later.
      weightMgSnapshot: size?.weightMg ?? product?.weightMg ?? 0,
      factorBpSnapshot: product?.factorBp ?? 0,
      silverRateMinorSnapshot: settings.silverRatePerGram,

      engravingFeeMinor: 0,

      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      lineTotalMinor: line.lineTotalMinor,
    };
  });

  // --- reference -----------------------------------------------------------
  let reference = generateOrderReference();
  for (let attempt = 0; attempt < 5; attempt++) {
    if (!(await referenceExists(reference))) break;
    reference = generateOrderReference();
    if (attempt === 4) throw new Error("REFERENCE_COLLISION");
  }

  // --- write ---------------------------------------------------------------
  const order = await createOrderTransaction({
    order: {
      reference,
      user: { connect: { id: user.id } },
      status: "PLACED",

      customerName: input.customerName.trim(),
      customerPhone: phone,
      addressLine: input.addressLine.trim(),
      addressCity: input.addressCity.trim(),
      addressNotes: input.addressNotes?.trim() || null,

      silverRateMinorSnapshot: settings.silverRatePerGram,
      subtotalMinor,
      deliveryFeeMinor,
      totalMinor,

      depositPercentSnapshot: depositPercent,
      depositDueMinor,
      balanceDueMinor,

      paymentMethod: input.paymentMethod,
    },
    items,
    cartId: cartRow.id,
  });

  return { reference: order.reference, id: order.id };
}