import Link from "next/link";
import { ChevronDown } from "lucide-react";

/**
 * The store's policies under the product details, each folded away until
 * tapped. Built on <details>, so it opens and closes without any JavaScript
 * and works with the keyboard and screen readers out of the box.
 */
export default function PolicySections({
  policies,
}: {
  policies: { slug: string; title: string; paragraphs: string[] }[];
}) {
  if (policies.length === 0) return null;

  return (
    <div className="mt-10 border-t border-line">
      {policies.map((p) => (
        <details key={p.slug} className="group border-b border-line">
          <summary
            className={
              "flex items-center justify-between gap-4 py-5 cursor-pointer list-none " +
              "[&::-webkit-details-marker]:hidden text-xs tracking-[0.2em] " +
              "hover:text-ink-soft transition-colors"
            }
          >
            {p.title.toUpperCase()}
            <ChevronDown
              size={16}
              strokeWidth={1.5}
              className="shrink-0 transition-transform duration-300 group-open:rotate-180"
            />
          </summary>

          <div className="pb-6 space-y-3">
            {p.paragraphs.map((paragraph, i) => (
              <p
                key={i}
                className="text-xs text-ink-soft leading-relaxed whitespace-pre-line"
              >
                {paragraph}
              </p>
            ))}
            <Link
              href={`/policies/${p.slug}`}
              className="inline-block pt-1 text-xs underline underline-offset-4 text-ink-soft hover:text-ink transition-colors"
            >
              Open full page
            </Link>
          </div>
        </details>
      ))}
    </div>
  );
}
