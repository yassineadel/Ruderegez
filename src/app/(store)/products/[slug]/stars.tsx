/** Read-only star display. Rounds to the nearest whole star - half stars add
 *  visual noise for very little information at this scale. */
export default function Stars({
  rating,
  size = "text-sm",
}: {
  rating: number;
  size?: string;
}) {
  const filled = Math.round(rating);
  return (
    <span
      className={`${size} tracking-[0.15em] leading-none`}
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      <span aria-hidden>{"★".repeat(filled)}</span>
      <span aria-hidden className="text-line">
        {"★".repeat(5 - filled)}
      </span>
    </span>
  );
}