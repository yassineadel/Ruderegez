import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-guards";
import { getOrCreateCart } from "@/modules/cart/cart-identity";

/**
 * The customer accepts a quote, and it becomes a cart line.
 *
 * The price written here is the QUOTED price, not a computed one. A custom
 * piece was priced by hand at a moment in time; it must not drift with the
 * silver rate the way a catalog item does.
 */
export async function acceptQuote(reference: string): Promise<void> {
  const user = await requireUser();

  const request = await prisma.customRequest.findUnique({
    where: { reference },
  });

  if (!request || request.userId !== user.id) {
    throw new Error("REQUEST_NOT_FOUND");
  }
  if (request.status !== "QUOTED") throw new Error("NOT_QUOTED");
  if (request.quotedPriceMinor === null) throw new Error("NOT_QUOTED");

  const cart = await getOrCreateCart();

  // The unique index is [cartId, productId, size] - both null here, and
  // Postgres treats two NULLs as different values, so it will NOT stop a
  // duplicate. This check is the only thing that does.
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, customRequestId: request.id },
  });
  if (existing) throw new Error("ALREADY_IN_CART");

  await prisma.$transaction([
    prisma.customRequest.update({
      where: { id: request.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
    prisma.cartItem.create({
      data: {
        cartId: cart.id,
        kind: "CUSTOM_QUOTE",
        customRequestId: request.id,
        quantity: 1,
        unitPriceMinor: request.quotedPriceMinor,
      },
    }),
  ]);
}

export async function declineQuote(reference: string): Promise<void> {
  const user = await requireUser();

  const request = await prisma.customRequest.findUnique({
    where: { reference },
  });

  if (!request || request.userId !== user.id) {
    throw new Error("REQUEST_NOT_FOUND");
  }
  if (request.status !== "QUOTED") throw new Error("NOT_QUOTED");

  await prisma.customRequest.update({
    where: { id: request.id },
    data: { status: "DECLINED", respondedAt: new Date() },
  });
}