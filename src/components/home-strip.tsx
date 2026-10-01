"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { formatEGP } from "@/lib/money";
import { cloudinaryUrl } from "@/lib/cloudinary";
import type { HomeSlideView } from "@/modules/homepage/service";

const INTERVAL = 4500;
/** After someone scrolls or taps the strip, leave it alone this long. */
const IDLE_AFTER_TOUCH = 8000;

/**
 * The homepage slider: one row of medium cards that glides along by itself,
 * one card at a time, and loops. It stops while the pointer is over it, while
 * something in it has focus, for a while after a swipe, and entirely for
 * visitors who ask their device for reduced motion.
 */
export default function HomeStrip({
  title,
  slides,
}: {
  title: string;
  slides: HomeSlideView[];
}) {
  const track = useRef<HTMLDivElement>(null);
  const lastTouch = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [edges, setEdges] = useState({ start: true, end: false });

  /** One card plus the gap - the distance a single step moves. */
  const step = useCallback(() => {
    const el = track.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return 0;
    const gap = Number.parseFloat(getComputedStyle(el).columnGap) || 0;
    return card.offsetWidth + gap;
  }, []);

  const updateEdges = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  const go = useCallback(
    (dir: 1 | -1) => {
      const el = track.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollBy({ left: dir * step(), behavior: "smooth" });
    },
    [step],
  );

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    updateEdges();
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateEdges, slides.length]);

  useEffect(() => {
    if (hovered || focused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      const el = track.current;
      // Nothing to move when every card already fits on screen.
      if (!el || el.scrollWidth <= el.clientWidth + 4) return;
      if (Date.now() - lastTouch.current < IDLE_AFTER_TOUCH) return;
      go(1);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [hovered, focused, go]);

  if (slides.length === 0) return null;

  const touched = () => {
    lastTouch.current = Date.now();
  };

  return (
    <section
      className="py-16 lg:py-20"
      aria-roledescription="carousel"
      aria-label={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div className="px-6 lg:px-12 flex items-end justify-between gap-6 mb-8">
        <h2 className="font-display text-3xl lg:text-4xl font-light">{title}</h2>
        <div className="hidden sm:flex gap-2">
          <ArrowButton label="Previous" disabled={edges.start} onClick={() => go(-1)}>
            <ArrowLeft size={16} strokeWidth={1.5} />
          </ArrowButton>
          <ArrowButton label="Next" disabled={false} onClick={() => go(1)}>
            <ArrowRight size={16} strokeWidth={1.5} />
          </ArrowButton>
        </div>
      </div>

      <div
        ref={track}
        onScroll={updateEdges}
        onPointerDown={touched}
        onWheel={touched}
        onTouchStart={touched}
        className={
          "flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth " +
          "px-6 lg:px-12 scroll-px-6 lg:scroll-px-12 pb-2 " +
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        }
      >
        {slides.map((s, i) => (
          <div
            key={s.id}
            className="snap-start shrink-0 w-[64vw] sm:w-[230px] lg:w-[250px]"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
          >
            <Card slide={s} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
//  CARDS  -  same 4:5 frame and caption rhythm, so the row reads as one line
// ============================================================================

function Card({ slide }: { slide: HomeSlideView }) {
  if (slide.kind === "PRODUCT") {
    return (
      <Link href={slide.href} className="group block">
        <Frame>
          <Photo url={slide.imageUrl} alt={slide.title} />
        </Frame>
        <Caption
          eyebrow={slide.eyebrow}
          title={slide.title}
          line={slide.priceMinor !== null ? formatEGP(slide.priceMinor) : null}
        />
      </Link>
    );
  }

  if (slide.kind === "REVIEW") {
    const photo = slide.hasCustomerPhoto ? slide.imageUrl : null;
    return (
      <Link href={slide.href} className="group block">
        <Frame className="flex flex-col">
          {photo && (
            <div className="h-1/2 overflow-hidden">
              <Photo url={photo} alt={`Photo from ${slide.author}`} />
            </div>
          )}
          <div className="flex-1 flex flex-col p-5 lg:p-6">
            <p className="text-xs tracking-[0.2em] mb-3" aria-label={`${slide.rating} out of 5 stars`}>
              {"★".repeat(slide.rating)}
              <span className="text-line">{"★".repeat(5 - slide.rating)}</span>
            </p>
            <blockquote
              className={
                "font-display font-light leading-snug " +
                (photo ? "text-base line-clamp-4" : "text-xl line-clamp-7")
              }
            >
              &ldquo;{slide.quote}&rdquo;
            </blockquote>
          </div>
        </Frame>
        <Caption eyebrow="Customer review" title={slide.author} line={`on ${slide.productName}`} />
      </Link>
    );
  }

  const body = (
    <>
      <Frame>
        <Photo url={slide.imageUrl} alt={slide.title ?? ""} />
      </Frame>
      {(slide.title || slide.subtitle) && (
        <Caption eyebrow={null} title={slide.title} line={slide.subtitle} />
      )}
    </>
  );

  if (!slide.href) return <div>{body}</div>;
  return slide.external ? (
    <a href={slide.href} target="_blank" rel="noopener noreferrer" className="group block">
      {body}
    </a>
  ) : (
    <Link href={slide.href} className="group block">
      {body}
    </Link>
  );
}

function Frame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={"aspect-[4/5] bg-bone-deep overflow-hidden " + className}>{children}</div>
  );
}

function Photo({ url, alt }: { url: string; alt: string }) {
  return (
    <img
      src={cloudinaryUrl(url, { width: 520 })}
      alt={alt}
      loading="lazy"
      draggable={false}
      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
    />
  );
}

function Caption({
  eyebrow,
  title,
  line,
}: {
  eyebrow: string | null;
  title: string | null;
  line: string | null;
}) {
  return (
    <div className="pt-4">
      {eyebrow && (
        <p className="text-[10px] tracking-[0.25em] text-ink-soft mb-1">
          {eyebrow.toUpperCase()}
        </p>
      )}
      {title && <p className="font-display text-lg font-light leading-tight truncate">{title}</p>}
      {line && <p className="text-sm text-ink-soft mt-1 truncate">{line}</p>}
    </div>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="h-10 w-10 border border-line flex items-center justify-center hover:border-ink transition-colors disabled:opacity-30 disabled:hover:border-line"
    >
      {children}
    </button>
  );
}
