import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Cart } from "@/generated/prisma/client";

const COOKIE = "rg_cart";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/**
 * READ-ONLY. Safe to call while a page renders.
 *
 * Returns null rather than creating anything, because a page render is not
 * allowed to set cookies - Next.js has already sent the headers by then.
 * An empty cart page is the correct thing to show a visitor who has none.
 */
export async function findCurrentCart(): Promise<Cart | null> {
  const session = await auth();

  if (session?.user?.id) {
    return prisma.cart.findUnique({ where: { userId: session.user.id } });
  }

  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  return prisma.cart.findUnique({ where: { guestToken: token } });
}

/**
 * READ OR CREATE. Only callable from a Server Action or Route Handler,
 * because it may set a cookie.
 *
 * Called when someone adds to their bag - at that point they need a cart to
 * exist, whether or not they have an account.
 */
export async function getOrCreateCart(): Promise<Cart> {
  const session = await auth();

  // --- signed in -----------------------------------------------------------
  if (session?.user?.id) {
    const userId = session.user.id;

    const existing = await prisma.cart.findUnique({ where: { userId } });
    if (existing) return existing;

    return prisma.cart.create({ data: { userId } });
  }

  // --- guest ---------------------------------------------------------------
  const store = await cookies();
  const token = store.get(COOKIE)?.value;

  if (token) {
    const existing = await prisma.cart.findUnique({
      where: { guestToken: token },
    });
    // The cookie can outlive the row - an old cart, a database reset. Fall
    // through and issue a fresh one rather than failing.
    if (existing) return existing;
  }

  const newToken = randomBytes(24).toString("base64url");

  const cart = await prisma.cart.create({ data: { guestToken: newToken } });

  store.set(COOKIE, newToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: THIRTY_DAYS,
    path: "/",
  });

  return cart;
}

/**
 * Moves a guest cart into the user's cart after sign-in (FR-42).
 *
 * Not wired up yet - call it from the sign-in flow once the cart works.
 * Quantities add together; the guest cart is deleted afterwards.
 */
export async function mergeGuestCart(userId: string): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return;

  const guestCart = await prisma.cart.findUnique({
    where: { guestToken: token },
    include: { items: true },
  });
  if (!guestCart || guestCart.items.length === 0) {
    store.delete(COOKIE);
    return;
  }

  const userCart =
    (await prisma.cart.findUnique({ where: { userId } })) ??
    (await prisma.cart.create({ data: { userId } }));

    for (const item of guestCart.items) {
    // Only catalog items merge through this constraint. A custom design has
    // no productId and is outside it entirely - that path arrives with the
    // 2D builder.
    if (!item.productId) continue;

    await prisma.cartItem.upsert({
      where: {
        cartId_productId_size: {
          cartId: userCart.id,
          productId: item.productId,
          size: item.size ?? "",
        },
      },
      update: { quantity: { increment: item.quantity } },
      create: {
        cartId: userCart.id,
        kind: item.kind,
        productId: item.productId,
        size: item.size ?? "",
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
      },
    });
  }

  await prisma.cart.delete({ where: { id: guestCart.id } });
  store.delete(COOKIE);
}