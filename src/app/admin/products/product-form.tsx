"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { formatEGP } from "@/lib/money";
import type { Minor } from "@/lib/money";
import type { PricingSettings } from "@/lib/settings";
import type { ProductType } from "@/generated/prisma/client";
import ImageUpload from "@/components/image-upload";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
} from "@/modules/admin/products-actions";
import { slugify } from "@/modules/admin/slugify";

interface FormState {
  id?: string;
  name: string;
  slug: string;
  description: string;
  typeId: string;
  audience: "MEN" | "WOMEN" | "UNISEX" | "NONE";
  weightG: number;
  factor: number;
  leadTimeDays: number;
  isFlatPrice: boolean;
  flatPriceEgp: number | null;
  isHidden: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  sizes: { label: string; weightG: number | null }[];
  images: { url: string; alt: string }[];
}

const BLANK: FormState = {
  name: "",
  slug: "",
  description: "",
  typeId: "",
  audience: "UNISEX",
  weightG: 5,
  factor: 2.5,
  leadTimeDays: 7,
  isFlatPrice: false,
  flatPriceEgp: null,
  isHidden: true,
  isFeatured: false,
  isBestSeller: false,
  isTrending: false,
  sizes: [],
  images: [],
};

export default function ProductForm({
  types,
  settings,
  initial,
}: {
  types: ProductType[];
  settings: PricingSettings;
  initial?: FormState;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<FormState>(
    initial ?? { ...BLANK, typeId: types[0]?.id ?? "" },
  );
  const [slugEdited, setSlugEdited] = useState(Boolean(initial));

  const isEdit = Boolean(f.id);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  /** Mirrors priceProduct so the admin sees the result as they type. */
  function preview(weightG: number): number {
    if (f.isFlatPrice) return Math.round((f.flatPriceEgp ?? 0) * 100);
    const weightMg = Math.round(weightG * 1000);
    const charged = Math.round(
      (weightMg * (100 + settings.weightTolerancePercent)) / 100,
    );
    return Math.round(
      (charged * Math.round(f.factor * 10000) * settings.silverRatePerGram) /
        10000000,
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const action = isEdit ? updateProductAction : createProductAction;
      const result = await action(f);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/products");
      router.refresh();
    });
  }

  function remove() {
    if (!f.id) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProductAction(f.id!);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/products");
      router.refresh();
    });
  }

  const field =
    "w-full bg-transparent border border-line px-4 py-3 text-sm " +
    "placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors";
  const label = "block text-xs tracking-[0.15em] text-ink-soft mb-2";

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-12 items-start max-w-5xl pb-32">
      <div className="space-y-12">
        {/* ---------------- basics ---------------- */}
        <section>
          <h2 className="font-display text-2xl font-light mb-6">Basics</h2>
          <div className="space-y-5">
            <label className="block">
              <span className={label}>NAME</span>
              <input
                className={field}
                value={f.name}
                onChange={(e) => {
                  set("name", e.target.value);
                  if (!slugEdited) set("slug", slugify(e.target.value));
                }}
                placeholder="Fine Chain Bracelet"
              />
            </label>

            <label className="block">
              <span className={label}>URL SLUG</span>
              <input
                className={field}
                value={f.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  set("slug", e.target.value);
                }}
              />
              <span className="block text-xs text-ink-soft mt-2">
                /products/{f.slug || "…"}
                {isEdit && " — changing this breaks existing links."}
              </span>
            </label>

            <label className="block">
              <span className={label}>DESCRIPTION</span>
              <textarea
                className={field + " min-h-28 resize-y"}
                value={f.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </label>

            <div className="grid sm:grid-cols-2 gap-5">
              <label className="block">
                <span className={label}>CATEGORY</span>
                <select
                  className={field}
                  value={f.typeId}
                  onChange={(e) => set("typeId", e.target.value)}
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={label}>AUDIENCE</span>
                <select
                  className={field}
                  value={f.audience}
                  onChange={(e) =>
                    set("audience", e.target.value as FormState["audience"])
                  }
                >
                  <option value="UNISEX">Unisex</option>
                  <option value="WOMEN">Women</option>
                  <option value="MEN">Men</option>
                  <option value="NONE">Not applicable</option>
                </select>
                <span className="block text-xs text-ink-soft mt-2">
                  &quot;Not applicable&quot; keeps a piece out of both the
                  men&apos;s and women&apos;s listings — for care kits and
                  similar.
                </span>
              </label>
            </div>
          </div>
        </section>

        {/* ---------------- pricing ---------------- */}
        <section>
          <h2 className="font-display text-2xl font-light mb-1">Pricing</h2>
          <p className="text-sm text-ink-soft mb-6">
            Priced from the live silver rate unless you set a fixed price.
          </p>

          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={f.isFlatPrice}
              onChange={(e) => set("isFlatPrice", e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm">
              Fixed price
              <span className="block text-xs text-ink-soft mt-0.5">
                For care kits and anything not priced by silver weight.
              </span>
            </span>
          </label>

          {f.isFlatPrice ? (
            <label className="block max-w-xs">
              <span className={label}>PRICE (EGP)</span>
              <input
                className={field}
                type="number"
                step="0.01"
                value={f.flatPriceEgp ?? ""}
                onChange={(e) =>
                  set(
                    "flatPriceEgp",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </label>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              <label className="block">
                <span className={label}>SILVER WEIGHT (GRAMS)</span>
                <input
                  className={field}
                  type="number"
                  step="0.1"
                  value={f.weightG}
                  onChange={(e) => set("weightG", Number(e.target.value))}
                />
              </label>
              <label className="block">
                <span className={label}>PRICING FACTOR</span>
                <input
                  className={field}
                  type="number"
                  step="0.1"
                  value={f.factor}
                  onChange={(e) => set("factor", Number(e.target.value))}
                />
                <span className="block text-xs text-ink-soft mt-2">
                  Covers labour and margin. 2.5 means two and a half times the
                  silver cost.
                </span>
              </label>
            </div>
          )}

          <label className="block max-w-xs mt-5">
            <span className={label}>LEAD TIME (DAYS)</span>
            <input
              className={field}
              type="number"
              value={f.leadTimeDays}
              onChange={(e) => set("leadTimeDays", Number(e.target.value))}
            />
          </label>
        </section>

        {/* ---------------- sizes ---------------- */}
        <section>
          <h2 className="font-display text-2xl font-light mb-1">Sizes</h2>
          <p className="text-sm text-ink-soft mb-6">
            Leave the weight blank to use the product weight. Set it when a
            larger size genuinely uses more silver.
          </p>

          <div className="space-y-3">
            {f.sizes.map((s, i) => (
              <div key={i} className="flex gap-3 items-start">
                <input
                  className={field + " flex-1"}
                  placeholder="Label — e.g. 18 cm"
                  value={s.label}
                  onChange={(e) => {
                    const next = [...f.sizes];
                    next[i] = { ...next[i], label: e.target.value };
                    set("sizes", next);
                  }}
                />
                <div className="w-40">
                  <input
                    className={field}
                    type="number"
                    step="0.1"
                    placeholder="Weight (g)"
                    value={s.weightG ?? ""}
                    onChange={(e) => {
                      const next = [...f.sizes];
                      next[i] = {
                        ...next[i],
                        weightG:
                          e.target.value === "" ? null : Number(e.target.value),
                      };
                      set("sizes", next);
                    }}
                  />
                  {!f.isFlatPrice && (
                    <p className="text-xs text-ink-soft mt-1.5 text-right">
                      {formatEGP(preview(s.weightG ?? f.weightG) as Minor)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    set(
                      "sizes",
                      f.sizes.filter((_, j) => j !== i),
                    )
                  }
                  className="p-3 text-ink-soft hover:text-ink transition-colors"
                  aria-label="Remove size"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() =>
              set("sizes", [...f.sizes, { label: "", weightG: null }])
            }
            className="mt-4 flex items-center gap-2 text-xs tracking-[0.15em] text-ink-soft hover:text-ink transition-colors"
          >
            <Plus size={14} /> ADD SIZE
          </button>
        </section>

        {/* ---------------- images ---------------- */}
        <section>
          <h2 className="font-display text-2xl font-light mb-1">Images</h2>
          <p className="text-sm text-ink-soft mb-6">
            The first image is the main photo shown in the catalogue.
          </p>

          <div className="space-y-4">
            {f.images.map((img, i) => (
              <div
                key={i}
                className="flex gap-4 items-start border border-line p-4"
              >
                <div className="w-20 aspect-[4/5] bg-bone-deep shrink-0 overflow-hidden">
                  {img.url && (
                    <img
                      src={img.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  {i === 0 && (
                    <p className="text-[10px] tracking-[0.2em] text-ink-soft">
                      MAIN PHOTO
                    </p>
                  )}
                  <input
                    className={field}
                    placeholder="Alt text — describe the photo (optional)"
                    value={img.alt}
                    onChange={(e) => {
                      const next = [...f.images];
                      next[i] = { ...next[i], alt: e.target.value };
                      set("images", next);
                    }}
                  />
                  {i > 0 && (
                    <button
                      onClick={() => {
                        const next = [...f.images];
                        const [moved] = next.splice(i, 1);
                        next.unshift(moved);
                        set("images", next);
                      }}
                      className="text-xs tracking-[0.15em] text-ink-soft hover:text-ink transition-colors"
                    >
                      MAKE MAIN PHOTO
                    </button>
                  )}
                </div>

                <button
                  onClick={() =>
                    set(
                      "images",
                      f.images.filter((_, j) => j !== i),
                    )
                  }
                  className="p-2 text-ink-soft hover:text-ink transition-colors"
                  aria-label="Remove image"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <ImageUpload
              value=""
              onChange={(url) => set("images", [...f.images, { url, alt: "" }])}
              folder="products"
              label="Upload a photo"
            />
          </div>
        </section>
      </div>

      {/* ---------------- sidebar ---------------- */}
      <div className="lg:sticky lg:top-10 space-y-6">
        <div className="border border-ink p-6">
          <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-2">
            PRICE NOW
          </p>
          <p className="font-display text-3xl font-light">
            {formatEGP(preview(f.weightG) as Minor)}
          </p>
          {!f.isFlatPrice && (
            <p className="text-xs text-ink-soft mt-3 leading-relaxed">
              {f.weightG}g × {f.factor} at{" "}
              {formatEGP(settings.silverRatePerGram)}/g, plus{" "}
              {settings.weightTolerancePercent}% tolerance.
            </p>
          )}
        </div>

        <div className="border border-line p-6 space-y-4">
          <p className="text-[10px] tracking-[0.2em] text-ink-soft">
            VISIBILITY
          </p>

          <Toggle
            checked={!f.isHidden}
            onChange={(v) => set("isHidden", !v)}
            title="Visible in store"
          />
          <Toggle
            checked={f.isFeatured}
            onChange={(v) => set("isFeatured", v)}
            title="Featured on homepage"
          />
          <Toggle
            checked={f.isBestSeller}
            onChange={(v) => set("isBestSeller", v)}
            title="Best seller"
          />
          <Toggle
            checked={f.isTrending}
            onChange={(v) => set("isTrending", v)}
            title="Trending"
          />
        </div>

        <button
          onClick={submit}
          disabled={pending}
          className="w-full bg-ink text-bone py-4 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {pending ? "SAVING…" : isEdit ? "SAVE CHANGES" : "CREATE PRODUCT"}
        </button>

        {isEdit && (
          <button
            onClick={remove}
            disabled={pending}
            className="w-full border border-red-800 text-red-800 py-3 text-xs tracking-[0.2em] hover:bg-red-800 hover:text-bone transition-colors disabled:opacity-40"
          >
            DELETE PRODUCT
          </button>
        )}

        {error && <p className="text-sm text-red-800">{error}</p>}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {title}
    </label>
  );
}
