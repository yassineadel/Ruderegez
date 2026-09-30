import type { Minor } from "@/lib/money";

// ============================================================================
//  CHECKOUT TOTALS - one formula for the page and for placeOrder.
// ============================================================================
//  The checkout page shows the customer an amount to transfer, and placeOrder
//  charges an amount. They must be the same number, so both call this. It is
//  pure (no server imports), which is what lets the client component use it.
//
//  total = subtotal - discount + delivery
//  The discount never touches the delivery fee.
// ============================================================================

export interface CheckoutTotals {
  subtotalMinor: Minor;
  discountMinor: Minor;
  deliveryFeeMinor: Minor;
  totalMinor: Minor;
  depositDueMinor: Minor;
  balanceDueMinor: Minor;
}

export function checkoutTotals(input: {
  subtotalMinor: Minor;
  discountMinor: Minor;
  deliveryFeeMinor: Minor;
  /** Full payment now, or the deposit percent now and the rest on collection. */
  payInFull: boolean;
  depositPercent: number;
}): CheckoutTotals {
  // Never more than the subtotal - a discount can't eat the delivery fee.
  const discountMinor = Math.min(input.discountMinor, input.subtotalMinor) as Minor;
  const totalMinor = (input.subtotalMinor -
    discountMinor +
    input.deliveryFeeMinor) as Minor;

  const depositDueMinor = input.payInFull
    ? totalMinor
    : (Math.round((totalMinor * input.depositPercent) / 100) as Minor);

  return {
    subtotalMinor: input.subtotalMinor,
    discountMinor,
    deliveryFeeMinor: input.deliveryFeeMinor,
    totalMinor,
    depositDueMinor,
    balanceDueMinor: (totalMinor - depositDueMinor) as Minor,
  };
}
