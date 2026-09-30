import { describe, it, expect } from "vitest";
import type { Minor } from "@/lib/money";
import {
  normalizeCode,
  isValidCode,
  promoDiscount,
  checkPromoRules,
  type PromoRuleFields,
} from "./calc";
import { checkoutTotals } from "@/modules/orders/totals";

describe("normalizeCode / isValidCode", () => {
  it("upper-cases and drops spaces", () => {
    expect(normalizeCode(" eid 25 ")).toBe("EID25");
  });

  it("accepts letters, digits, - and _", () => {
    expect(isValidCode("EID-25_X")).toBe(true);
  });

  it("rejects too short, too long and odd characters", () => {
    expect(isValidCode("AB")).toBe(false);
    expect(isValidCode("A".repeat(21))).toBe(false);
    expect(isValidCode("EID!25")).toBe(false);
  });
});

describe("promoDiscount", () => {
  it("takes the percent of the subtotal", () => {
    expect(promoDiscount(100000 as Minor, 10)).toBe(10000);
  });

  it("rounds down to the piastre", () => {
    // 123457 * 10% = 12345.7 -> 12345
    expect(promoDiscount(123457 as Minor, 10)).toBe(12345);
  });
});

describe("checkPromoRules", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  const base: PromoRuleFields = {
    isActive: true,
    startsAt: null,
    expiresAt: null,
    maxUses: null,
    maxUsesPerCustomer: null,
    minSubtotalMinor: null,
    usedCount: 0,
  };
  const ctx = { now, subtotalMinor: 50000 as Minor, customerUses: 0 };

  it("passes a plain active code", () => {
    expect(checkPromoRules(base, ctx)).toBeNull();
  });

  it("refuses a switched-off code", () => {
    expect(checkPromoRules({ ...base, isActive: false }, ctx)).toBe("PROMO_INACTIVE");
  });

  it("refuses before the start and after the end", () => {
    expect(
      checkPromoRules({ ...base, startsAt: new Date("2026-10-02T00:00:00Z") }, ctx),
    ).toBe("PROMO_NOT_STARTED");
    expect(checkPromoRules({ ...base, expiresAt: now }, ctx)).toBe("PROMO_EXPIRED");
  });

  it("refuses when the total limit is used up", () => {
    expect(checkPromoRules({ ...base, maxUses: 5, usedCount: 5 }, ctx)).toBe(
      "PROMO_LIMIT_REACHED",
    );
  });

  it("refuses a customer who already used it", () => {
    expect(
      checkPromoRules({ ...base, maxUsesPerCustomer: 1 }, { ...ctx, customerUses: 1 }),
    ).toBe("PROMO_CUSTOMER_LIMIT");
  });

  it("refuses a subtotal below the minimum", () => {
    expect(checkPromoRules({ ...base, minSubtotalMinor: 60000 }, ctx)).toBe(
      "PROMO_MIN_SUBTOTAL",
    );
  });
});

describe("checkoutTotals", () => {
  it("takes the discount off the subtotal, not the delivery", () => {
    const t = checkoutTotals({
      subtotalMinor: 100000 as Minor,
      discountMinor: 20000 as Minor,
      deliveryFeeMinor: 8000 as Minor,
      payInFull: true,
      depositPercent: 50,
    });
    expect(t.totalMinor).toBe(88000);
    expect(t.depositDueMinor).toBe(88000);
    expect(t.balanceDueMinor).toBe(0);
  });

  it("works out the deposit on the discounted total", () => {
    const t = checkoutTotals({
      subtotalMinor: 100000 as Minor,
      discountMinor: 10000 as Minor,
      deliveryFeeMinor: 0 as Minor,
      payInFull: false,
      depositPercent: 50,
    });
    expect(t.depositDueMinor).toBe(45000);
    expect(t.balanceDueMinor).toBe(45000);
  });
});
