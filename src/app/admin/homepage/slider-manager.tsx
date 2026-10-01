"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import ImageUpload from "@/components/image-upload";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { isSafeLink } from "@/modules/homepage/links";
import type { HomeSlideView } from "@/modules/homepage/service";
import {
  createSlideAction,
  setSlideActiveAction,
  deleteSlideAction,
  moveSlideAction,
  setSliderTitleAction,
} from "@/modules/homepage/actions";

type Kind = "PRODUCT" | "REVIEW" | "IMAGE";

interface Props {
  title: string;
  slides: { id: string; kind: Kind; isActive: boolean; view: HomeSlideView | null }[];
  products: { id: string; name: string }[];
  reviews: { id: string; label: string }[];
}

const field =
  "w-full bg-transparent border border-line px-3 py-2.5 text-sm placeholder:text-ink-soft " +
  "focus:outline-none focus:border-ink transition-colors";
const labelCls = "block text-[10px] tracking-[0.2em] text-ink-soft mb-2";

const KINDS: { key: Kind; label: string }[] = [
  { key: "PRODUCT", label: "Product" },
  { key: "REVIEW", label: "Review" },
  { key: "IMAGE", label: "Picture" },
];

export default function SliderManager({ title, slides, products, reviews }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      after?.();
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl space-y-10">
      <TitleForm initial={title} pending={pending} run={run} />
      <AddCard products={products} reviews={reviews} pending={pending} run={run} />

      {error && <p className="text-sm text-red-800">{error}</p>}

      <div>
        <h2 className="font-display text-2xl font-light mb-4">Cards</h2>
        {slides.length === 0 ? (
          <p className="text-sm text-ink-soft py-6">
            No cards yet - the slider is hidden from the homepage.
          </p>
        ) : (
          <div className="border border-line">
            {slides.map((s, i) => (
              <SlideRow
                key={s.id}
                slide={s}
                first={i === 0}
                last={i === slides.length - 1}
                pending={pending}
                run={run}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function TitleForm({
  initial,
  pending,
  run,
}: {
  initial: string;
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [title, setTitle] = useState(initial);
  return (
    <form
      className="flex gap-3 items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => setSliderTitleAction(title));
      }}
    >
      <label className="flex-1">
        <span className={labelCls}>SECTION TITLE ON THE HOMEPAGE</span>
        <input
          className={field}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={40}
        />
      </label>
      <button
        type="submit"
        disabled={pending || title.trim() === initial || !title.trim()}
        className="border border-ink px-5 py-2.5 text-xs tracking-[0.15em] disabled:opacity-40 hover:bg-ink hover:text-bone transition-colors"
      >
        SAVE
      </button>
    </form>
  );
}

function AddCard({
  products,
  reviews,
  pending,
  run,
}: {
  products: Props["products"];
  reviews: Props["reviews"];
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => void;
}) {
  const [kind, setKind] = useState<Kind>("PRODUCT");
  const [productId, setProductId] = useState("");
  const [reviewId, setReviewId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const linkBad = linkUrl.trim() !== "" && !isSafeLink(linkUrl.trim());
  const ready =
    kind === "PRODUCT" ? !!productId : kind === "REVIEW" ? !!reviewId : !!imageUrl && !linkBad;

  function reset() {
    setProductId("");
    setReviewId("");
    setImageUrl("");
    setTitle("");
    setSubtitle("");
    setLinkUrl("");
  }

  return (
    <form
      className="border border-line p-6"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            createSlideAction(
              kind === "PRODUCT"
                ? { kind, productId }
                : kind === "REVIEW"
                  ? { kind, reviewId }
                  : { kind, imageUrl, title, subtitle, linkUrl },
            ),
          reset,
        );
      }}
    >
      <h2 className="font-display text-2xl font-light mb-5">Add a card</h2>

      <div className="flex gap-2 mb-6">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => setKind(k.key)}
            className={
              "border px-4 py-2 text-xs tracking-[0.15em] transition-colors " +
              (kind === k.key ? "border-ink bg-ink text-bone" : "border-line hover:border-ink")
            }
          >
            {k.label.toUpperCase()}
          </button>
        ))}
      </div>

      {kind === "PRODUCT" && (
        <label className="block">
          <span className={labelCls}>PRODUCT</span>
          <select className={field} value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Choose a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="block text-xs text-ink-soft mt-2">
            Shows its photo, name and live price, and opens the product.
          </span>
        </label>
      )}

      {kind === "REVIEW" && (
        <label className="block">
          <span className={labelCls}>REVIEW</span>
          <select className={field} value={reviewId} onChange={(e) => setReviewId(e.target.value)}>
            <option value="">Choose a review…</option>
            {reviews.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="block text-xs text-ink-soft mt-2">
            Shows the stars, the quote and the customer&apos;s photo if they added
            one, and opens the product&apos;s reviews.
          </span>
        </label>
      )}

      {kind === "IMAGE" && (
        <div className="space-y-4">
          <div>
            <span className={labelCls}>PICTURE</span>
            <div className="max-w-xs">
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                folder="homepage"
                label="Upload picture"
              />
            </div>
            <span className="block text-xs text-ink-soft mt-2">
              Shown in a 4:5 portrait frame - portrait photos fit best.
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label>
              <span className={labelCls}>TITLE (OPTIONAL)</span>
              <input
                className={field}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                placeholder="e.g. The Eid edit"
              />
            </label>
            <label>
              <span className={labelCls}>SUBTITLE (OPTIONAL)</span>
              <input
                className={field}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                maxLength={100}
                placeholder="e.g. Rings made to order"
              />
            </label>
          </div>
          <label className="block">
            <span className={labelCls}>LINK (OPTIONAL)</span>
            <input
              className={field}
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="/products?type=rings  or  https://instagram.com/ruderegez"
            />
            <span className={"block text-xs mt-2 " + (linkBad ? "text-red-800" : "text-ink-soft")}>
              A page on this site starting with /, or a full https:// address.
              Leave empty for a picture that isn&apos;t clickable.
            </span>
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !ready}
        className="mt-6 bg-ink text-bone px-8 py-3.5 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {pending ? "ADDING…" : "ADD CARD"}
      </button>
    </form>
  );
}

function SlideRow({
  slide,
  first,
  last,
  pending,
  run,
}: {
  slide: Props["slides"][number];
  first: boolean;
  last: boolean;
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const v = slide.view;
  const thumb = v?.imageUrl ?? null;
  const text = !v
    ? "Not showing - its product or review is hidden"
    : v.kind === "PRODUCT"
      ? v.title
      : v.kind === "REVIEW"
        ? `${"★".repeat(v.rating)} ${v.author} on ${v.productName}`
        : (v.title ?? v.href ?? "Picture");

  return (
    <div
      className={
        "px-4 py-4 border-b border-line last:border-0 flex items-center gap-4 " +
        (slide.isActive && v ? "" : "bg-bone-deep")
      }
    >
      <div className="flex flex-col">
        <button
          onClick={() => run(() => moveSlideAction(slide.id, "up"))}
          disabled={pending || first}
          className="text-ink-soft hover:text-ink disabled:opacity-20"
          aria-label="Move up"
        >
          <ArrowUp size={14} />
        </button>
        <button
          onClick={() => run(() => moveSlideAction(slide.id, "down"))}
          disabled={pending || last}
          className="text-ink-soft hover:text-ink disabled:opacity-20"
          aria-label="Move down"
        >
          <ArrowDown size={14} />
        </button>
      </div>

      <div className="w-12 aspect-[4/5] bg-bone-deep shrink-0 overflow-hidden flex items-center justify-center text-ink-soft text-xs">
        {thumb ? (
          <img src={cloudinaryUrl(thumb, { width: 96 })} alt="" className="h-full w-full object-cover" />
        ) : (
          "“ ”"
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] tracking-[0.2em] text-ink-soft">
          {slide.kind === "IMAGE" ? "PICTURE" : slide.kind}
          {!slide.isActive && " · OFF"}
        </p>
        <p className={"text-sm truncate " + (v ? "" : "text-red-800")}>{text}</p>
      </div>

      <button
        onClick={() => run(() => setSlideActiveAction(slide.id, !slide.isActive))}
        disabled={pending}
        className="border border-ink px-4 py-2 text-xs tracking-[0.15em] disabled:opacity-40 hover:bg-ink hover:text-bone transition-colors shrink-0"
      >
        {slide.isActive ? "SWITCH OFF" : "SWITCH ON"}
      </button>
      <button
        onClick={() => {
          if (confirm("Remove this card from the slider?")) run(() => deleteSlideAction(slide.id));
        }}
        disabled={pending}
        className="text-xs text-ink-soft hover:text-red-800 underline underline-offset-4 disabled:opacity-40 shrink-0"
      >
        Delete
      </button>
    </div>
  );
}
