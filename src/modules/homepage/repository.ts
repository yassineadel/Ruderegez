import { prisma } from "@/lib/db";
import type { HomeSlideKind } from "@/generated/prisma/client";

const PRODUCT_VISIBLE = { isHidden: false, deletedAt: null } as const;

/** Everything a card needs, read live from its product or review. */
const SLIDE_INCLUDE = {
  product: {
    include: {
      images: { orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }] },
      type: true,
    },
  },
  review: {
    include: {
      user: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
      product: {
        select: {
          name: true,
          slug: true,
          isHidden: true,
          deletedAt: true,
          images: {
            orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
            take: 1,
          },
        },
      },
    },
  },
};

const ORDER = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

export function findActiveSlides() {
  return prisma.homeSlide.findMany({
    where: { isActive: true },
    include: SLIDE_INCLUDE,
    orderBy: ORDER,
  });
}

export function findAllSlides() {
  return prisma.homeSlide.findMany({ include: SLIDE_INCLUDE, orderBy: ORDER });
}

export type SlideWithContent = Awaited<ReturnType<typeof findAllSlides>>[number];

export function findSlideById(id: string) {
  return prisma.homeSlide.findUnique({ where: { id } });
}

/** Products the admin can put in the slider: visible, with at least one photo. */
export function findPickableProducts() {
  return prisma.product.findMany({
    where: { ...PRODUCT_VISIBLE, images: { some: {} } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/** Reviews the admin can feature: visible, on a visible product. Newest first. */
export function findPickableReviews() {
  return prisma.review.findMany({
    where: { hiddenAt: null, product: PRODUCT_VISIBLE },
    select: {
      id: true,
      rating: true,
      body: true,
      user: { select: { name: true } },
      product: { select: { name: true } },
      _count: { select: { images: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export function findVisibleProduct(id: string) {
  return prisma.product.findFirst({
    where: { id, ...PRODUCT_VISIBLE, images: { some: {} } },
    select: { id: true },
  });
}

export function findVisibleReview(id: string) {
  return prisma.review.findFirst({
    where: { id, hiddenAt: null, product: PRODUCT_VISIBLE },
    select: { id: true },
  });
}

export async function nextSlideOrder(): Promise<number> {
  const last = await prisma.homeSlide.aggregate({ _max: { sortOrder: true } });
  return (last._max.sortOrder ?? -1) + 1;
}

export function createSlideRow(data: {
  kind: HomeSlideKind;
  productId: string | null;
  reviewId: string | null;
  imageUrl: string | null;
  title: string | null;
  subtitle: string | null;
  linkUrl: string | null;
  sortOrder: number;
  createdByUserId: string;
}) {
  return prisma.homeSlide.create({ data });
}

export function setSlideActiveRow(id: string, isActive: boolean) {
  return prisma.homeSlide.update({ where: { id }, data: { isActive } });
}

export function deleteSlideRow(id: string) {
  return prisma.homeSlide.delete({ where: { id } });
}

export function setSlideOrder(ids: string[]) {
  return prisma.$transaction(
    ids.map((id, i) => prisma.homeSlide.update({ where: { id }, data: { sortOrder: i } })),
  );
}

export function upsertSetting(key: string, value: string, userId: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value, updatedByUserId: userId },
    create: { key, value, updatedByUserId: userId },
  });
}
