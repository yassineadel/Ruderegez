"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { removeReviewPhotoAction } from "@/modules/admin/reviews-actions";
import { cloudinaryUrl } from "@/lib/cloudinary";

/** A review's photos, each removable on its own with a logged reason. */
export default function ReviewPhotoControls({
  images,
}: {
  images: { id: string; url: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removing, setRemoving] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function remove(imageId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeReviewPhotoAction({ imageId, reason });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRemoving(null);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="mb-4">
      <div className="flex gap-3">
        {images.map((img) => (
          <div key={img.id} className="relative">
            <a href={img.url} target="_blank" rel="noopener noreferrer">
              <img
                src={cloudinaryUrl(img.url, { width: 160, height: 160 })}
                alt=""
                className={
                  "w-20 aspect-square object-cover bg-bone-deep " +
                  (removing === img.id ? "ring-2 ring-red-800" : "")
                }
              />
            </a>
            <button
              type="button"
              onClick={() => {
                setRemoving(removing === img.id ? null : img.id);
                setError(null);
              }}
              className="absolute -top-2 -right-2 bg-bone border border-line rounded-full p-1 text-ink-soft hover:text-red-800"
              aria-label="Remove this photo"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {removing && (
        <div className="mt-3 flex gap-3 max-w-md">
          <input
            className="flex-1 bg-transparent border border-line px-3 py-2 text-sm focus:outline-none focus:border-ink transition-colors"
            placeholder="Reason for removing this photo"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            onClick={() => remove(removing)}
            disabled={pending || reason.trim().length < 3}
            className="bg-ink text-bone px-4 py-2 text-xs tracking-[0.15em] disabled:opacity-40"
          >
            {pending ? "REMOVING…" : "REMOVE"}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-800">{error}</p>}
    </div>
  );
}
