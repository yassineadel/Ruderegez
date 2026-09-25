"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import ImageUpload from "@/components/image-upload";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { submitCustomRequestAction } from "@/modules/custom/actions";

interface UploadedImage {
  url: string;
  sizeBytes: number;
  mimeType: string;
}

const MAX_IMAGES = 6;

export default function CustomRequestForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [description, setDescription] = useState("");
  const [size, setSize] = useState("");
  const [weight, setWeight] = useState("");

  const field =
    "w-full bg-transparent border border-line px-4 py-3.5 text-sm " +
    "placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors";
  const label = "block text-xs tracking-[0.15em] text-ink-soft mb-2";

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitCustomRequestAction({
        description,
        requestedSize: size || undefined,
        requestedWeightG: weight ? Number(weight) : null,
        images,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/custom/${result.data!.reference}`);
    });
  }

  return (
    <div className="space-y-10">
      <section>
        <span className={label}>PHOTOS</span>
        <p className="text-xs text-ink-soft mb-4 leading-relaxed">
          Up to {MAX_IMAGES}. A reference photo, a sketch, or something similar
          you like - whatever shows us what you mean.
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
                  onClick={() =>
                    setImages(images.filter((_, j) => j !== i))
                  }
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

      <section>
        <label className="block">
          <span className={label}>WHAT ARE YOU AFTER?</span>
          <textarea
            className={field + " min-h-32 resize-y"}
            placeholder="Describe the piece - the style, any detail that matters, who it's for."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </section>

      <section className="grid sm:grid-cols-2 gap-5">
        <label className="block">
          <span className={label}>SIZE</span>
          <input
            className={field}
            placeholder="18 cm, size 7, medium…"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
          <span className="block text-xs text-ink-soft mt-2">
            Optional. However you normally describe it.
          </span>
        </label>

        <label className="block">
          <span className={label}>ROUGH WEIGHT (GRAMS)</span>
          <input
            className={field}
            type="number"
            step="0.1"
            placeholder="8"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <span className="block text-xs text-ink-soft mt-2">
            Optional. Leave it blank if you&apos;re not sure - most people
            aren&apos;t, and we&apos;ll suggest one.
          </span>
        </label>
      </section>

      <div>
        <button
          onClick={submit}
          disabled={pending || images.length === 0 || description.trim().length < 10}
          className="w-full bg-ink text-bone py-4 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {pending ? "SENDING…" : "SEND REQUEST →"}
        </button>

        {error && <p className="mt-4 text-sm text-red-800">{error}</p>}

        <p className="mt-4 text-xs text-ink-soft leading-relaxed">
          Sending this costs nothing and commits you to nothing. We&apos;ll come
          back with a price, and it&apos;s yours to accept or decline.
        </p>
      </div>
    </div>
  );
}