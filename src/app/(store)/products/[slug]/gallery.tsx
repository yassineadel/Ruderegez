"use client";

import { useState } from "react";
import { cloudinaryUrl } from "@/lib/cloudinary";
import type { ProductDetail } from "@/modules/catalog/repository";

export default function ProductGallery({
  images,
  name,
}: {
  images: ProductDetail["images"];
  name: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-[4/5] bg-bone-deep flex items-center justify-center text-ink-soft text-xs tracking-[0.2em]">
        NO IMAGE
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-[4/5] bg-bone-deep overflow-hidden mb-3">
        <img
          src={cloudinaryUrl(images[active].url, { width: 1000 })}
          alt={images[active].alt ?? name}
          className="h-full w-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-3">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              className={
                "w-20 aspect-[4/5] bg-bone-deep overflow-hidden border-2 transition-colors " +
                (i === active ? "border-ink" : "border-transparent")
              }
              aria-label={`View image ${i + 1}`}
            >
              <img
                src={cloudinaryUrl(img.url, { width: 160 })}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}