"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReviewAction } from "@/modules/reviews/actions";

const RATING_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export default function ReviewForm({
  productId,
  initialRating = 0,
  initialBody = "",
  isEdit = false,
  maxLength,
}: {
  productId: string;
  initialRating?: number;
  initialBody?: string;
  isEdit?: boolean;
  maxLength: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const shown = hover || rating;

  function handleSubmit() {
    setError(null);
    setSaved(false);

    if (rating === 0) {
      setError("Please choose a star rating.");
      return;
    }

    startTransition(async () => {
      const result = await submitReviewAction({ productId, rating, body });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="max-w-lg">
      <p className="text-xs tracking-[0.15em] text-ink-soft mb-3">
        YOUR RATING
      </p>
      <div
        className="flex items-center gap-1 mb-6"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            aria-pressed={rating === n}
            className={
              "text-2xl leading-none px-0.5 transition-colors " +
              (n <= shown ? "text-ink" : "text-line hover:text-ink-soft")
            }
          >
            ★
          </button>
        ))}
        <span className="ml-3 text-sm text-ink-soft">
          {RATING_WORDS[shown]}
        </span>
      </div>

      <label className="block">
        <span className="block text-xs tracking-[0.15em] text-ink-soft mb-2">
          YOUR REVIEW
        </span>
        <textarea
          className={
            "w-full bg-transparent border border-line px-4 py-3.5 text-sm min-h-32 resize-y " +
            "placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors"
          }
          placeholder="How does it look and feel? How was the finish, the fit, the delivery?"
          value={body}
          maxLength={maxLength}
          onChange={(e) => setBody(e.target.value)}
        />
        <span className="block text-right text-xs text-ink-soft mt-1">
          {body.length} / {maxLength}
        </span>
      </label>

      <button
        onClick={handleSubmit}
        disabled={pending}
        className="mt-4 bg-ink text-bone px-10 py-3.5 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {pending ? "SAVING…" : isEdit ? "UPDATE REVIEW" : "POST REVIEW"}
      </button>

      {error && <p className="mt-4 text-sm text-red-800">{error}</p>}
      {saved && (
        <p className="mt-4 text-sm text-ink-soft">
          {isEdit ? "Your review has been updated." : "Thank you - your review is live."}
        </p>
      )}
    </div>
  );
}