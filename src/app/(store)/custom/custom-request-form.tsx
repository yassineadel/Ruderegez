"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import ImageUpload from "@/components/image-upload";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { formatEGP, type Minor } from "@/lib/money";
import {
  submitCustomRequestAction,
  listDesignsAction,
  listSizeOptionsAction,
} from "@/modules/custom/actions";

// ============================================================================
//  STEPS
// ============================================================================
//  1 source    → new design, or one of ours
//  2 category  → any active product type
//  3 design    → Ruderegez only: a carousel of pieces from that category
//  4 details   → description (+ photos for a new design), size
//
//  The customer never types a weight. Each category size has a fixed weight
//  set in the admin panel; picking a size shows it with an estimated price.
//
//  Each step only renders once the one before it has an answer, so the
//  details step can trust that source and category are set.
// ============================================================================

type Source = "NEW_DESIGN" | "RUDEREGEZ_DESIGN";
type Step = "source" | "category" | "design" | "details";

interface Category {
  id: string;
  name: string;
}

interface Design {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface SizeOption {
  id: string;
  label: string;
  weightMg: number;
  estimateMinor: number | null;
}

interface UploadedImage {
  url: string;
  sizeBytes: number;
  mimeType: string;
}

const MAX_IMAGES = 6;
const MIN_DESCRIPTION: Record<Source, number> = {
  NEW_DESIGN: 30,
  RUDEREGEZ_DESIGN: 10,
};

export default function CustomRequestForm({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("source");
  const [source, setSource] = useState<Source | null>(null);
  const [category, setCategory] = useState<Category | null>(null);

  const [designs, setDesigns] = useState<Design[] | null>(null);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [design, setDesign] = useState<Design | null>(null);
  const [slide, setSlide] = useState(0);

  const [sizes, setSizes] = useState<SizeOption[] | null>(null);
  const [sizeId, setSizeId] = useState("");

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [description, setDescription] = useState("");

  const isRuderegez = source === "RUDEREGEZ_DESIGN";
  const steps: Step[] = isRuderegez
    ? ["source", "category", "design", "details"]
    : ["source", "category", "details"];
  const stepIndex = steps.indexOf(step);

  const field =
    "w-full bg-transparent border border-line px-4 py-3.5 text-sm " +
    "placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors";
  const label = "block text-xs tracking-[0.15em] text-ink-soft mb-2";
  const option =
    "text-left border px-5 py-5 transition-colors hover:border-ink";

  // ---------------------------------------------------------------- handlers

  function chooseSource(next: Source) {
    // Switching path clears anything that only made sense on the other one.
    if (next !== source) {
      setDesign(null);
      setImages([]);
    }
    setSource(next);
    setError(null);
    setStep("category");
  }

  function chooseCategory(next: Category) {
    if (next.id !== category?.id) {
      setDesign(null);
      setDesigns(null);
    }
    setCategory(next);
    setError(null);

    if (source === "RUDEREGEZ_DESIGN") {
      setStep("design");
      loadDesigns(next.id);
    } else {
      setStep("details");
      loadSizes(next.id, null);
    }
  }

  async function loadDesigns(typeId: string) {
    setLoadingDesigns(true);
    const result = await listDesignsAction(typeId);
    setLoadingDesigns(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const list = result.data ?? [];
    setDesigns(list);
    // Reopen on the piece they chose last time, if they came back.
    const previous = list.findIndex((d) => d.id === design?.id);
    setSlide(previous >= 0 ? previous : 0);
  }

  /** The estimate depends on the piece too (its factor), so sizes are
   *  fetched once both the category and - if any - the design are known. */
  async function loadSizes(typeId: string, baseProductId: string | null) {
    setSizes(null);
    setSizeId("");
    const result = await listSizeOptionsAction(typeId, baseProductId);
    if (!result.ok) {
      setError(result.error);
      setSizes([]);
      return;
    }
    setSizes(result.data ?? []);
  }

  function chooseDesign(next: Design) {
    setDesign(next);
    setError(null);
    setStep("details");
    if (category) loadSizes(category.id, next.id);
  }

  function back() {
    setError(null);
    if (stepIndex > 0) setStep(steps[stepIndex - 1]);
  }

  function submit() {
    if (!source || !category) return;
    setError(null);
    startTransition(async () => {
      const result = await submitCustomRequestAction({
        source,
        typeId: category.id,
        baseProductId: design?.id ?? null,
        description,
        sizeId: sizeId || null,
        images: isRuderegez ? [] : images,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/custom/${result.data!.reference}`);
    });
  }

  const minLength = source ? MIN_DESCRIPTION[source] : 10;
  const selectedSize = sizes?.find((s) => s.id === sizeId) ?? null;
  const canSubmit =
    !pending &&
    !!category &&
    (!isRuderegez || !!design) &&
    description.trim().length >= minLength;

  // ------------------------------------------------------------------ render

  return (
    <div>
      {/* progress + back */}
      <div className="flex items-center justify-between mb-8">
        <p className="text-[10px] tracking-[0.3em] text-ink-soft">
          STEP {stepIndex + 1} OF {steps.length}
        </p>
        {stepIndex > 0 && (
          <button
            onClick={back}
            className="flex items-center gap-2 text-xs tracking-[0.15em] text-ink-soft hover:text-ink transition-colors"
          >
            <ArrowLeft size={14} /> BACK
          </button>
        )}
      </div>

      {/* ------------------------------------------------ 1. source */}
      {step === "source" && (
        <section>
          <h2 className="font-display text-2xl font-light mb-6">
            Where does your piece start?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => chooseSource("RUDEREGEZ_DESIGN")}
              className={`${option} ${source === "RUDEREGEZ_DESIGN" ? "border-ink" : "border-line"}`}
            >
              <span className="block font-display text-xl mb-2">
                A Ruderegez design
              </span>
              <span className="block text-xs text-ink-soft leading-relaxed">
                Pick one of our pieces and tell us what you&apos;d like
                changed.
              </span>
            </button>
            <button
              onClick={() => chooseSource("NEW_DESIGN")}
              className={`${option} ${source === "NEW_DESIGN" ? "border-ink" : "border-line"}`}
            >
              <span className="block font-display text-xl mb-2">
                A new design
              </span>
              <span className="block text-xs text-ink-soft leading-relaxed">
                Something that doesn&apos;t exist yet - describe it and
                we&apos;ll make it.
              </span>
            </button>
          </div>
        </section>
      )}

      {/* ------------------------------------------------ 2. category */}
      {step === "category" && (
        <section>
          <h2 className="font-display text-2xl font-light mb-6">
            What kind of piece?
          </h2>
          {categories.length === 0 ? (
            <p className="text-sm text-ink-soft">
              No categories are available right now.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => chooseCategory(c)}
                  className={`${option} text-center text-sm ${category?.id === c.id ? "border-ink" : "border-line"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------ 3. design */}
      {step === "design" && category && (
        <section>
          <h2 className="font-display text-2xl font-light mb-6">
            Which {category.name.toLowerCase()}?
          </h2>

          {loadingDesigns && (
            <p className="flex items-center gap-2 text-sm text-ink-soft">
              <Loader2 size={16} className="animate-spin" /> Loading pieces…
            </p>
          )}

          {!loadingDesigns && designs && designs.length === 0 && (
            <div className="text-sm text-ink-soft leading-relaxed">
              <p className="mb-4">
                We don&apos;t have any pieces in this category yet.
              </p>
              <button
                onClick={() => chooseSource("NEW_DESIGN")}
                className="text-xs tracking-[0.15em] text-ink underline underline-offset-4"
              >
                DESCRIBE A NEW DESIGN INSTEAD
              </button>
            </div>
          )}

          {!loadingDesigns && designs && designs.length > 0 && (() => {
            const current = designs[slide];
            const go = (delta: number) =>
              setSlide((slide + delta + designs.length) % designs.length);
            return (
              <div>
                {/* main slide */}
                <div className="relative border border-line">
                  <div className="aspect-square sm:aspect-[4/3] bg-bone-deep overflow-hidden">
                    {current.imageUrl ? (
                      <img
                        key={current.id}
                        src={cloudinaryUrl(current.imageUrl, { width: 900, height: 900 })}
                        alt={current.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-ink-soft">
                        No photo
                      </div>
                    )}
                  </div>

                  {designs.length > 1 && (
                    <>
                      <button
                        onClick={() => go(-1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-bone/90 border border-line p-2 hover:border-ink transition-colors"
                        aria-label="Previous design"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={() => go(1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-bone/90 border border-line p-2 hover:border-ink transition-colors"
                        aria-label="Next design"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                </div>

                {/* name + choose */}
                <div className="flex items-center justify-between gap-4 mt-4">
                  <div>
                    <p className="font-display text-2xl">{current.name}</p>
                    <p className="text-xs text-ink-soft">
                      {slide + 1} / {designs.length}
                    </p>
                  </div>
                  <button
                    onClick={() => chooseDesign(current)}
                    className="bg-ink text-bone px-6 py-3 text-xs tracking-[0.2em] hover:opacity-90 transition-opacity shrink-0"
                  >
                    CHOOSE THIS DESIGN
                  </button>
                </div>

                {/* thumbnails */}
                {designs.length > 1 && (
                  <div className="flex gap-2 mt-5 overflow-x-auto pb-2">
                    {designs.map((d, i) => (
                      <button
                        key={d.id}
                        onClick={() => setSlide(i)}
                        className={`w-16 aspect-square shrink-0 bg-bone-deep overflow-hidden border transition-colors ${i === slide ? "border-ink" : "border-line opacity-60 hover:opacity-100"}`}
                        aria-label={d.name}
                      >
                        {d.imageUrl && (
                          <img
                            src={cloudinaryUrl(d.imageUrl, { width: 128, height: 128 })}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </section>
      )}

      {/* ------------------------------------------------ 4. details */}
      {step === "details" && source && category && (
        <div className="space-y-10">
          {/* summary of the choices so far */}
          <section className="border border-line p-5 flex gap-5 items-center">
            {isRuderegez && design?.imageUrl && (
              <div className="w-24 aspect-square bg-bone-deep overflow-hidden shrink-0">
                <img
                  src={cloudinaryUrl(design.imageUrl, { width: 200, height: 200 })}
                  alt={design.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="text-sm">
              <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-1">
                {isRuderegez ? "ALTERING" : "NEW DESIGN"} · {category.name.toUpperCase()}
              </p>
              <p className="font-display text-xl">
                {isRuderegez ? design?.name : `A new ${category.name.toLowerCase()}`}
              </p>
            </div>
          </section>

          <section>
            <label className="block">
              <span className={label}>
                {isRuderegez
                  ? "WHAT WOULD YOU LIKE CHANGED?"
                  : "DESCRIBE YOUR PIECE"}
              </span>
              <textarea
                className={field + " min-h-40 resize-y"}
                placeholder={
                  isRuderegez
                    ? "e.g. Make the band thinner, add a small stone in the centre, engrave a name on the inside."
                    : "The shape, the style, the size, any detail that matters, who it's for. The more you tell us, the closer we get."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {description.trim().length < minLength && (
                <span className="block text-xs text-ink-soft mt-2">
                  At least {minLength} characters.
                </span>
              )}
            </label>
          </section>

          {!isRuderegez && (
            <section>
              <span className={label}>PHOTOS (OPTIONAL)</span>
              <p className="text-xs text-ink-soft mb-4 leading-relaxed">
                Up to {MAX_IMAGES}. A sketch or a reference photo helps, but
                a good description is enough.
              </p>

              {images.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4">
                  {images.map((img, i) => (
                    <div key={img.url} className="relative">
                      <div className="w-24 aspect-square bg-bone-deep overflow-hidden border border-line">
                        <img
                          src={cloudinaryUrl(img.url, { width: 200, height: 200 })}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => setImages(images.filter((_, j) => j !== i))}
                        className="absolute -top-2 -right-2 bg-ink text-bone rounded-full p-1 hover:opacity-90 transition-opacity"
                        aria-label="Remove photo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {images.length < MAX_IMAGES && (
                <ImageUpload
                  value=""
                  onChange={() => {
                    /* handled by onUpload - we need the size and type too */
                  }}
                  onUpload={(file) => setImages((prev) => [...prev, file])}
                  folder="designs"
                  label="Add a photo"
                />
              )}
            </section>
          )}

          {/* size - only when the admin has set sizes for this category */}
          {sizes === null && (
            <p className="flex items-center gap-2 text-sm text-ink-soft">
              <Loader2 size={16} className="animate-spin" /> Loading sizes…
            </p>
          )}

          {sizes && sizes.length > 0 && (
            <section>
              <label className="block">
                <span className={label}>SIZE (OPTIONAL)</span>
                <select
                  className={field + " appearance-none cursor-pointer"}
                  value={sizeId}
                  onChange={(e) => setSizeId(e.target.value)}
                >
                  <option value="">Not sure yet</option>
                  {sizes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              {selectedSize ? (
                <div className="mt-4 border border-line p-4 text-sm">
                  <p>
                    Silver weight about{" "}
                    <span className="font-medium">
                      {(selectedSize.weightMg / 1000).toFixed(1)} g
                    </span>
                  </p>
                  {selectedSize.estimateMinor !== null && (
                    <p className="mt-1">
                      Estimated price{" "}
                      <span className="font-medium">
                        {formatEGP(selectedSize.estimateMinor as Minor)}
                      </span>
                    </p>
                  )}
                  <p className="text-xs text-ink-soft mt-2 leading-relaxed">
                    An estimate from today&apos;s silver rate. Your changes may
                    move it up or down - the exact price comes with our quote.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-ink-soft mt-2">
                  Leave it if you&apos;re not sure - we&apos;ll suggest one.
                </p>
              )}
            </section>
          )}

          <div>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="w-full bg-ink text-bone py-4 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {pending ? "SENDING…" : "SEND REQUEST →"}
            </button>

            <p className="mt-4 text-xs text-ink-soft leading-relaxed">
              Sending this costs nothing and commits you to nothing. We&apos;ll
              come back with a price, and it&apos;s yours to accept or decline.
            </p>
          </div>
        </div>
      )}

      {error && <p className="mt-6 text-sm text-red-800">{error}</p>}
    </div>
  );
}