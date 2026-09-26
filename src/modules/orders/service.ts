import type { Minor } from "@/lib/money";
import { getPricingSettings, getSetting } from "@/lib/settings";
import { requireUser } from "@/lib/auth-guards";
import { getCartView } from "@/modules/cart/service";
import { findCurrentCart } from "@/modules/cart/cart-identity";
import { prisma } from "@/lib/db";
import type { PaymentMethod } from "@/generated/prisma/client";
import { generateOrderReference } from "./reference";
import { assertUsableSession } from "./checkout-session";
import {
  createOrderTransaction,
  referenceExists,
  findOrderByReference,
  createPaymentProof,
} from "./repository";

export interface PlaceOrderInput {
  customerName: string;
  customerPhone: string;
  addressLine: string;
  addressCity: string;
  addressNotes?: string;
  paymentMethod: PaymentMethod;
  /** The price hold this order is placed from - it fixes the silver rate. */
  checkoutSessionId: string;
  paymentScreenshotUrl: string;
  paymentReferenceNumber?: string;
}

/**
 * Creates an order from the current cart.
 *
 * The prices used are the ones the CUSTOMER WAS JUST SHOWN. Checkout holds
 * the silver rate in a CheckoutSession (5 minutes to upload the receipt, 15
 * more to order), and the bag is priced here at that held rate - not the
 * live one. The customer paid a number; this charges exactly that number.
 *
 * Everything is then FROZEN. The rate, the weights, the factors, and the
 * deposit percent are all snapshotted, so this order can be recomputed and
 * defended months from now even if the product is edited or deleted.
 */
export async function placeOrder(input: PlaceOrderInput) {
  const user = await requireUser();

  // The hold decides the rate. Checked first: an expired or foreign session
  // stops everything before any other work.
  const { rateMinor } = await assertUsableSession(input.checkoutSessionId, user.id);

  const [cart, cartRow, liveSettings, storeAddress] = await Promise.all([
    getCartView({ silverRateOverride: rateMinor }),
    findCurrentCart(),
    getPricingSettings(),
    getSetting("storeAddress"),
  ]);

  // Everything below - line prices, snapshots - uses the HELD rate.
  const settings = { ...liveSettings, silverRatePerGram: rateMinor };

  if (!cartRow || cart.lines.length === 0) throw new Error("EMPTY_CART");

  // --- payment method ------------------------------------------------------
  // Two options only: pay in full now (delivered), or pay the deposit now and
  // the rest when collecting from the store. DEPOSIT_THEN_CASH_ON_DELIVERY
  // stays in the enum so older orders still read correctly - it can't be
  // chosen now.
  const ALLOWED: PaymentMethod[] = ["FULL_INSTAPAY", "DEPOSIT_THEN_PICKUP"];
  if (!ALLOWED.includes(input.paymentMethod)) {
    throw new Error("INVALID_PAYMENT_METHOD");
  }
  const isPickup = input.paymentMethod === "DEPOSIT_THEN_PICKUP";

  // --- validate the customer details --------------------------------------
  if (input.customerName.trim().length < 2) throw new Error("INVALID_ADDRESS");
  // A collection order has no delivery address to check.
  if (!isPickup && input.addressLine.trim().length < 6) {
    throw new Error("INVALID_ADDRESS");
  }

  // Egyptian mobile: 01 followed by 0, 1, 2 or 5, then eight digits.
  const phone = input.customerPhone.replace(/[\s-]/g, "");
  if (!/^01[0125]\d{8}$/.test(phone)) throw new Error("INVALID_PHONE");

  // --- payment receipt -------------------------------------------------------
  // The customer pays before placing the order, so the receipt is required.
  // It must be one of our own Cloudinary uploads - never an arbitrary URL
  // that the admin panel would then render.
  if (!input.paymentScreenshotUrl) throw new Error("PROOF_REQUIRED");
  if (!input.paymentScreenshotUrl.startsWith("https://res.cloudinary.com/")) {
    throw new Error("INVALID_UPLOAD");
  }

  // --- money ---------------------------------------------------------------
  const subtotalMinor = cart.subtotalMinor;
  // Nothing is delivered on a collection order, so nothing is charged for it.
  const deliveryFeeMinor = isPickup ? 0 : settings.deliveryFee;
  const totalMinor = subtotalMinor + deliveryFeeMinor;

  const depositPercent = settings.depositPercent;
  const depositDueMinor =
    input.paymentMethod === "FULL_INSTAPAY"
      ? totalMinor
      : Math.round((totalMinor * depositPercent) / 100);
  const balanceDueMinor = totalMinor - depositDueMinor;

  // --- snapshot every line -------------------------------------------------
  // Two kinds of line, snapshotted from two different places. A catalog line
  // copies its product; a custom line copies the quote it was accepted from,
  // because there is no product behind it.

  const catalogLines = cart.lines.filter((l) => !l.isCustom);
  const customLines = cart.lines.filter((l) => l.isCustom);

  const [products, customRequests] = await Promise.all([
    catalogLines.length
      ? prisma.product.findMany({
          where: { id: { in: catalogLines.map((l) => l.productId) } },
          include: { sizes: true },
        })
      : Promise.resolve([]),
    customLines.length
      ? prisma.customRequest.findMany({
          where: {
            reference: {
              in: customLines.map((l) => l.slug.replace("custom/", "")),
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const byId = new Map(products.map((p) => [p.id, p]));
  const crByRef = new Map(customRequests.map((c) => [c.reference, c]));

  const items = cart.lines.map((line) => {
    // ---- accepted quote ---------------------------------------------------
    if (line.isCustom) {
      const cr = crByRef.get(line.slug.replace("custom/", ""));

      return {
        kind: "CUSTOM_QUOTE" as const,
        productId: null,
        customRequestId: cr?.id ?? null,

        nameSnapshot: line.name,
        imageUrlSnapshot: line.imageUrl,
        sizeSnapshot: line.size || null,

        // The quote's own weight. factorBp is 0 because there was no factor -
        // this piece was priced by hand, not by formula, and zero says that
        // rather than pretending otherwise.
        weightMgSnapshot: cr?.quotedWeightMg ?? 0,
        factorBpSnapshot: 0,
        silverRateMinorSnapshot: settings.silverRatePerGram,

        engravingFeeMinor: 0,

        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
        lineTotalMinor: line.lineTotalMinor,
      };
    }

    // ---- catalog item -----------------------------------------------------
    const product = byId.get(line.productId);
    const size = product?.sizes.find((s) => s.label === line.size);

    return {
      kind: "CATALOG" as const,
      productId: line.productId,
      customRequestId: null,

      nameSnapshot: line.name,
      imageUrlSnapshot: line.imageUrl,
      sizeSnapshot: line.size || null,

      // The INPUTS, not just the answer - so any line can be recomputed and
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
      // Paid and receipt attached - it goes straight to the admin's queue.
      status: "PAYMENT_UNDER_REVIEW",

      customerName: input.customerName.trim(),
      customerPhone: phone,
      // For a collection order the "address" snapshot is where they collect
      // from - so the order page and the admin both show the store.
      addressLine: isPickup
        ? `Collect from store${storeAddress ? ` - ${storeAddress}` : ""}`
        : input.addressLine.trim(),
      addressCity: input.addressCity.trim(),
      addressNotes: isPickup ? null : input.addressNotes?.trim() || null,

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
    proof: {
      screenshotUrl: input.paymentScreenshotUrl,
      amountMinor: depositDueMinor,
      referenceNumber: input.paymentReferenceNumber?.trim() || undefined,
    },
    checkoutSessionId: input.checkoutSessionId,
  });

  return { reference: order.reference, id: order.id };
}

export async function submitPaymentProof(input: {
  reference: string;
  screenshotUrl: string;
  referenceNumber?: string;
}) {
  const user = await requireUser();

  const order = await findOrderByReference(input.reference);
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.userId !== user.id) throw new Error("ORDER_NOT_FOUND");

  if (order.status !== "PLACED") throw new Error("ALREADY_SUBMITTED");

  if (!input.screenshotUrl.startsWith("https://res.cloudinary.com/")) {
    throw new Error("INVALID_UPLOAD");
  }

  await createPaymentProof({
    orderId: order.id,
    screenshotUrl: input.screenshotUrl,
    amountMinor: order.depositDueMinor,
    referenceNumber: input.referenceNumber?.trim() || undefined,
  });
}