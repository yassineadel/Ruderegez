import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type CartWithItems = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: { include: { images: true; type: true; sizes: true } };
      };
    };
  };
}>;

export function findCartWithItems(cartId: string): Promise<CartWithItems | null> {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
              type: true,
              sizes: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export function countCartItems(cartId: string): Promise<number> {
  return prisma.cartItem
    .aggregate({ where: { cartId }, _sum: { quantity: true } })
    .then((r) => r._sum.quantity ?? 0);
}

/**
 * Adds a line, or increments it if the same product and size is already there.
 *
 * `size` is "" and never null for a product without sizes. Postgres treats
 * two NULLs as different values, so a nullable column in a unique index does
 * not prevent duplicates - empty strings do compare equal, and the constraint
 * works as intended.
 */
export function upsertCartItem(data: {
  cartId: string;
  productId: string;
  size: string;
  quantity: number;
  unitPriceMinor: number;
}) {
  return prisma.cartItem.upsert({
    where: {
      cartId_productId_size: {
        cartId: data.cartId,
        productId: data.productId,
        size: data.size,
      },
    },
    update: { quantity: { increment: data.quantity } },
    create: {
      cartId: data.cartId,
      kind: "CATALOG",
      productId: data.productId,
      size: data.size,
      quantity: data.quantity,
      unitPriceMinor: data.unitPriceMinor,
    },
  });
}

export function updateCartItemQuantity(itemId: string, cartId: string, quantity: number) {
  // cartId in the where clause stops one visitor editing another's item.
  return prisma.cartItem.updateMany({
    where: { id: itemId, cartId },
    data: { quantity },
  });
}

export function deleteCartItem(itemId: string, cartId: string) {
  return prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
}

export function clearCart(cartId: string) {
  return prisma.cartItem.deleteMany({ where: { cartId } });
}