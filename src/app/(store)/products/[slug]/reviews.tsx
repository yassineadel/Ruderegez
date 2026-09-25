import Link from "next/link";
import type { DisplayReview, MyReviewState } from "@/modules/reviews/service";
import { REVIEW_BODY_MAX } from "@/modules/reviews/errors";
import Stars from "./stars";
import ReviewForm from "./review-form";

export default function Reviews({
  productId,
  slug,
  reviews,
  average,
  count,
  myState,
}: {
  productId: string;
  slug: string;
  reviews: DisplayReview[];
  average: number | null;
  count: number;
  myState: MyReviewState;
}) {
  return (
    <section
      id="reviews"
      className="max-w-6xl mx-auto mt-24 pt-16 border-t border-line scroll-mt-24"
    >
      <div className="grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20">
        {/* Summary + the customer's own review */}
        <div>
          <h2 className="font-display text-3xl font-light mb-4">Reviews</h2>

          {average !== null ? (
            <div className="flex items-center gap-3 mb-10">
              <span className="font-display text-4xl font-light">
                {average.toFixed(1)}
              </span>
              <div>
                <Stars rating={average} />
                <p className="text-xs text-ink-soft mt-1">
                  {count} {count === 1 ? "review" : "reviews"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-soft mb-10">
              No reviews yet.
            </p>
          )}

          <MyReview productId={productId} slug={slug} state={myState} />
        </div>

        {/* The list */}
        <div>
          {reviews.length === 0 ? (
            <p className="text-sm text-ink-soft lg:pt-2">
              Every piece is made to order, so reviews come from customers who
              have received theirs.
            </p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {reviews.map((r) => (
                <li key={r.id} className="py-8">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <Stars rating={r.rating} />
                    <time
                      dateTime={r.createdAt.toISOString()}
                      className="text-xs text-ink-soft"
                    >
                      {r.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-line mb-3">
                    {r.body}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {r.authorName}, verified buyer
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function MyReview({
  productId,
  slug,
  state,
}: {
  productId: string;
  slug: string;
  state: MyReviewState;
}) {
  switch (state.status) {
    case "SIGNED_OUT":
      return (
        <p className="text-sm text-ink-soft leading-relaxed">
          Bought this piece?{" "}
          <Link
            href={`/sign-in?next=/products/${slug}%23reviews`}
            className="text-ink underline underline-offset-4"
          >
            Sign in
          </Link>{" "}
          to leave a review.
        </p>
      );

    case "NOT_ELIGIBLE":
      return (
        <p className="text-sm text-ink-soft leading-relaxed">
          You can review this piece once an order containing it has been
          delivered.
        </p>
      );

    case "CAN_REVIEW":
      return (
        <div>
          <p className="text-sm mb-6">Your piece has arrived - how is it?</p>
          <ReviewForm productId={productId} maxLength={REVIEW_BODY_MAX} />
        </div>
      );

    case "REVIEWED":
      return (
        <div>
          <p className="text-sm mb-2">You reviewed this piece.</p>
          {state.review.isHidden && (
            <p className="text-xs text-ink-soft mb-4 leading-relaxed">
              Your review isn&apos;t currently shown on the site. Get in touch
              if you think this is a mistake.
            </p>
          )}
          <details className="mt-4 group">
            <summary className="text-sm text-ink-soft hover:text-ink underline underline-offset-4 cursor-pointer list-none mb-6">
              <span className="group-open:hidden">Edit your review</span>
              <span className="hidden group-open:inline">Close</span>
            </summary>
            <ReviewForm
              productId={productId}
              initialRating={state.review.rating}
              initialBody={state.review.body}
              isEdit
              maxLength={REVIEW_BODY_MAX}
            />
          </details>
        </div>
      );
  }
}