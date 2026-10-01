import type { Minor } from "@/lib/money";
import { getPricingSettings, getSetting, type PricingSettings } from "@/lib/settings";
import { requirePermission } from "@/lib/auth-guards";
import { isOwnUpload } from "@/lib/cloudinary";
import { priceProduct } from "@/modules/pricing/price-product";
import { toDisplayName } from "@/modules/reviews/service";
import type { HomeSlideKind } from "@/generated/prisma/client";
import { isSafeLink, isExternal } from "./links";
import {
  findActiveSlides,
  findAllSlides,
  findSlideById,
  findPickableProducts,
  findPickableReviews,
  findVisibleProduct,
  findVisibleReview,
  nextSlideOrder,
  createSlideRow,
  setSlideActiveRow,
  deleteSlideRow,
  setSlideOrder,
  upsertSetting,
  type SlideWithContent,
} from "./repository";

export const SLIDER_TITLE_KEY = "homeSliderTitle";
export const SLIDER_TITLE_DEFAULT = "From the studio";

// ============================================================================
//  WHAT A CARD LOOKS LIKE ON THE HOMEPAGE
// ============================================================================

export type HomeSlideView =
  | {
      id: string;
      kind: "PRODUCT";
      href: string;
      imageUrl: string;
      eyebrow: string;
      title: string;
      priceMinor: Minor | null;
    }
  | {
      id: string;
      kind: "REVIEW";
      href: string;
      /** The customer's own photo, else the product's. */
      imageUrl: string | null;
      hasCustomerPhoto: boolean;
      rating: number;
      quote: string;
      author: string;
      productName: string;
    }
  | {
      id: string;
      kind: "IMAGE";
      href: string | null;
      external: boolean;
      imageUrl: string;
      title: string | null;
      subtitle: string | null;
    };

/**
 * Turns a slide row into a card, or null when it shouldn't show - its product
 * is hidden, deleted or has no photo, or its review is hidden. Checked on
 * every render, so hiding a product takes it out of the slider too.
 */
function toView(s: SlideWithContent, settings: PricingSettings): HomeSlideView | null {
  if (s.kind === "PRODUCT") {
    const p = s.product;
    if (!p || p.isHidden || p.deletedAt || !p.images[0]) return null;
    let priceMinor: Minor | null = null;
    try {
      priceMinor = priceProduct(p, settings);
    } catch {
      // A misconfigured flat-price product still shows - just without a price.
    }
    return {
      id: s.id,
      kind: "PRODUCT",
      href: `/products/${p.slug}`,
      imageUrl: p.images[0].url,
      eyebrow: p.type.name,
      title: p.name,
      priceMinor,
    };
  }

  if (s.kind === "REVIEW") {
    const r = s.review;
    if (!r || r.hiddenAt || r.product.isHidden || r.product.deletedAt) return null;
    const customerPhoto = r.images[0]?.url ?? null;
    return {
      id: s.id,
      kind: "REVIEW",
      href: `/products/${r.product.slug}#reviews`,
      imageUrl: customerPhoto ?? r.product.images[0]?.url ?? null,
      hasCustomerPhoto: customerPhoto !== null,
      rating: r.rating,
      quote: r.body,
      author: toDisplayName(r.user.name),
      productName: r.product.name,
    };
  }

  if (!s.imageUrl) return null;
  return {
    id: s.id,
    kind: "IMAGE",
    href: s.linkUrl,
    external: s.linkUrl ? isExternal(s.linkUrl) : false,
    imageUrl: s.imageUrl,
    title: s.title,
    subtitle: s.subtitle,
  };
}

/** Public - the homepage. */
export async function getHomeSlider(): Promise<{ title: string; slides: HomeSlideView[] }> {
  const [rows, settings, title] = await Promise.all([
    findActiveSlides(),
    getPricingSettings(),
    getSetting(SLIDER_TITLE_KEY, SLIDER_TITLE_DEFAULT),
  ]);
  return {
    title: title || SLIDER_TITLE_DEFAULT,
    slides: rows.map((r) => toView(r, settings)).filter((v) => v !== null),
  };
}

// ============================================================================
//  ADMIN  -  the HOMEPAGE section
// ============================================================================

export async function getSliderAdmin() {
  await requirePermission("HOMEPAGE");
  const [rows, settings, title, products, reviews] = await Promise.all([
    findAllSlides(),
    getPricingSettings(),
    getSetting(SLIDER_TITLE_KEY, SLIDER_TITLE_DEFAULT),
    findPickableProducts(),
    findPickableReviews(),
  ]);

  return {
    title: title || SLIDER_TITLE_DEFAULT,
    slides: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      isActive: r.isActive,
      view: toView(r, settings),
    })),
    products,
    reviews: reviews.map((r) => ({
      id: r.id,
      label: `${"★".repeat(r.rating)} ${toDisplayName(r.user.name)} on ${r.product.name}${
        r._count.images ? " (with photo)" : ""
      } - "${r.body.length > 60 ? `${r.body.slice(0, 60)}…` : r.body}"`,
    })),
  };
}

export interface CreateSlideInput {
  kind: HomeSlideKind;
  productId?: string;
  reviewId?: string;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  linkUrl?: string;
}

export async function createSlide(input: CreateSlideInput) {
  const admin = await requirePermission("HOMEPAGE");

  const row = {
    kind: input.kind,
    productId: null as string | null,
    reviewId: null as string | null,
    imageUrl: null as string | null,
    title: null as string | null,
    subtitle: null as string | null,
    linkUrl: null as string | null,
  };

  if (input.kind === "PRODUCT") {
    if (!input.productId || !(await findVisibleProduct(input.productId))) {
      throw new Error("SLIDE_PRODUCT_INVALID");
    }
    row.productId = input.productId;
  } else if (input.kind === "REVIEW") {
    if (!input.reviewId || !(await findVisibleReview(input.reviewId))) {
      throw new Error("SLIDE_REVIEW_INVALID");
    }
    row.reviewId = input.reviewId;
  } else if (input.kind === "IMAGE") {
    // Only our own upload - the homepage renders this for every visitor.
    if (!input.imageUrl || !isOwnUpload(input.imageUrl, "homepage")) {
      throw new Error("SLIDE_IMAGE_REQUIRED");
    }
    row.imageUrl = input.imageUrl;
    row.title = input.title?.trim() || null;
    row.subtitle = input.subtitle?.trim() || null;
    if ((row.title?.length ?? 0) > 60 || (row.subtitle?.length ?? 0) > 100) {
      throw new Error("SLIDE_TEXT_TOO_LONG");
    }
    const link = input.linkUrl?.trim();
    if (link) {
      if (!isSafeLink(link)) throw new Error("SLIDE_LINK_INVALID");
      row.linkUrl = link;
    }
  } else {
    throw new Error("SLIDE_KIND_INVALID");
  }

  return createSlideRow({ ...row, sortOrder: await nextSlideOrder(), createdByUserId: admin.id });
}

export async function setSlideActive(id: string, isActive: boolean) {
  await requirePermission("HOMEPAGE");
  if (!(await findSlideById(id))) throw new Error("SLIDE_NOT_FOUND");
  await setSlideActiveRow(id, isActive);
}

export async function deleteSlide(id: string) {
  await requirePermission("HOMEPAGE");
  if (!(await findSlideById(id))) throw new Error("SLIDE_NOT_FOUND");
  await deleteSlideRow(id);
}

export async function moveSlide(id: string, direction: "up" | "down") {
  await requirePermission("HOMEPAGE");
  const ids = (await findAllSlides()).map((s) => s.id);
  const from = ids.indexOf(id);
  if (from === -1) throw new Error("SLIDE_NOT_FOUND");
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  await setSlideOrder(ids);
}

export async function setSliderTitle(raw: string) {
  const admin = await requirePermission("HOMEPAGE");
  const title = raw.trim();
  if (title.length < 1 || title.length > 40) throw new Error("SLIDER_TITLE_INVALID");
  await upsertSetting(SLIDER_TITLE_KEY, title, admin.id);
}
