"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEGP } from "@/lib/money";
import { cloudinaryUrl } from "@/lib/cloudinary";

interface Slide {
  slug: string;
  name: string;
  typeName: string;
  imageUrl: string;
  priceMinor: number;
}

const INTERVAL = 5000;

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;

    const id = setInterval(
      () => setActive((i) => (i + 1) % slides.length),
      INTERVAL,
    );

    // Without this, every render stacks another interval and the carousel
    // starts sprinting.
    return () => clearInterval(id);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div
      className="relative h-full min-h-[50vh] lg:min-h-0 bg-bone-deep overflow-hidden group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <Link
          key={slide.slug}
          href={`/products/${slide.slug}`}
          aria-hidden={i !== active}
          tabIndex={i === active ? 0 : -1}
          className={
            "absolute inset-0 transition-opacity duration-1000 " +
            (i === active ? "opacity-100" : "opacity-0 pointer-events-none")
          }
        >
          <img
            src={cloudinaryUrl(slide.imageUrl, { width: 1200 })}
            alt={slide.name}
            className="h-full w-full object-cover"
          />

          {/* Gradient so the text stays readable over a light photo */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/50 to-transparent" />

          <div className="absolute bottom-8 left-8 right-8 text-bone">
            <p className="text-[10px] tracking-[0.25em] opacity-80 mb-1">
              {slide.typeName.toUpperCase()}
            </p>
            <p className="font-display text-2xl font-light mb-1">
              {slide.name}
            </p>
            <p className="text-sm opacity-90">
              {formatEGP(slide.priceMinor as never)}
            </p>
          </div>
        </Link>
      ))}

      {slides.length > 1 && (
        <div className="absolute bottom-8 right-8 flex gap-2 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Show item ${i + 1}`}
              className={
                "h-1.5 transition-all duration-300 " +
                (i === active ? "w-6 bg-bone" : "w-1.5 bg-bone/50 hover:bg-bone/80")
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}