import { randomInt } from "crypto";

/**
 * A human-readable order reference: RG-2609-0117
 *
 *   RG    brand
 *   26    year
 *   09    month
 *   0117  random
 *
 * Customers read this over the phone and write it on transfer notes, so it
 * has to be short, unambiguous, and speakable. A cuid is none of those.
 *
 * Random rather than sequential: a sequential counter tells anyone who orders
 * how many orders the shop has taken, and needs a lock to stay unique under
 * concurrency. Collisions are handled by the caller retrying.
 */
export function generateOrderReference(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = String(randomInt(0, 10000)).padStart(4, "0");
  return `RG-${yy}${mm}-${rand}`;
}