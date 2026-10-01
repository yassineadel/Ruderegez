"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import {
  cloudinaryUrl,
  cloudinaryVideoUrl,
  cloudinaryVideoPoster,
} from "@/lib/cloudinary";
import type { ProductDetail } from "@/modules/catalog/repository";

/**
 * The product's photos, then its video if it has one. The video is the last
 * thumbnail - the main photo still leads - and plays in the same 4:5 frame,
 * so switching between them never makes the page jump.
 */
export default function ProductGallery({
  images,
  videoUrl,
  name,
}: {
  images: ProductDetail["images"];
  videoUrl: string | null;
  name: string;
}) {
  const [active, setActive] = useState(0);

  // Photos 0..n-1, the video (if any) at index n.
  const videoIndex = videoUrl ? images.length : -1;
  const count = images.length + (videoUrl ? 1 : 0);
  const showingVideo = active === videoIndex;

  if (count === 0) {
    return (
      <div className="aspect-[4/5] bg-bone-deep flex items-center justify-center text-ink-soft text-xs tracking-[0.2em]">
        NO IMAGE
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-[4/5] bg-bone-deep overflow-hidden mb-3">
        {showingVideo && videoUrl ? (
          <video
            // A new element per video, so it starts from the beginning.
            key={videoUrl}
            src={cloudinaryVideoUrl(videoUrl)}
            poster={cloudinaryVideoPoster(videoUrl, { width: 1000 })}
            controls
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
            aria-label={`Video of ${name}`}
          />
        ) : (
          <img
            src={cloudinaryUrl(images[active].url, { width: 1000 })}
            alt={images[active].alt ?? name}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-3 flex-wrap">
          {images.map((img, i) => (
            <Thumb
              key={img.id}
              active={i === active}
              onClick={() => setActive(i)}
              label={`View image ${i + 1}`}
              src={cloudinaryUrl(img.url, { width: 160 })}
            />
          ))}
          {videoUrl && (
            <Thumb
              active={showingVideo}
              onClick={() => setActive(videoIndex)}
              label="Play video"
              src={cloudinaryVideoPoster(videoUrl, { width: 160 })}
              isVideo
            />
          )}
        </div>
      )}
    </div>
  );
}

function Thumb({
  active,
  onClick,
  label,
  src,
  isVideo = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  src: string;
  isVideo?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "relative w-20 aspect-[4/5] bg-bone-deep overflow-hidden border-2 transition-colors " +
        (active ? "border-ink" : "border-transparent")
      }
      aria-label={label}
    >
      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      {isVideo && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
          <span className="h-7 w-7 rounded-full bg-bone/90 flex items-center justify-center">
            <Play size={12} className="text-ink ml-0.5" fill="currentColor" />
          </span>
        </span>
      )}
    </button>
  );
}
