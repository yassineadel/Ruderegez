"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cloudinaryUrl } from "@/lib/cloudinary";

/** A review's photos: small squares under the text, full size on click. */
export default function ReviewPhotos({ urls, label }: { urls: string[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % urls.length));
      if (e.key === "ArrowLeft") {
        setOpen((i) => (i === null ? i : (i - 1 + urls.length) % urls.length));
      }
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, urls.length]);

  return (
    <>
      <div className="flex gap-2 mb-3">
        {urls.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpen(i)}
            className="w-20 aspect-square bg-bone-deep overflow-hidden hover:opacity-80 transition-opacity"
            aria-label={`${label} ${i + 1} of ${urls.length}`}
          >
            <img
              src={cloudinaryUrl(url, { width: 160, height: 160 })}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <img
            src={cloudinaryUrl(urls[open], { width: 1400 })}
            alt={`${label} ${open + 1} of ${urls.length}`}
            className="max-h-[85vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={() => setOpen(null)}
            className="absolute top-5 right-5 text-bone/80 hover:text-bone"
            aria-label="Close"
          >
            <X size={22} />
          </button>

          {urls.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open - 1 + urls.length) % urls.length);
                }}
                className="absolute left-3 sm:left-6 text-bone/80 hover:text-bone p-2"
                aria-label="Previous photo"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open + 1) % urls.length);
                }}
                className="absolute right-3 sm:right-6 text-bone/80 hover:text-bone p-2"
                aria-label="Next photo"
              >
                <ChevronRight size={28} />
              </button>
              <p className="absolute bottom-5 text-xs tracking-[0.2em] text-bone/70">
                {open + 1} / {urls.length}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
