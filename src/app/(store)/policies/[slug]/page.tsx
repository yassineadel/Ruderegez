import { notFound } from "next/navigation";
import { getSetting } from "@/lib/settings";

const POLICIES: Record<string, { key: string; title: string }> = {
  terms: { key: "policyTerms", title: "Terms of sale" },
  returns: { key: "policyReturns", title: "Returns policy" },
  privacy: { key: "policyPrivacy", title: "Privacy policy" },
};

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) notFound();

  const text = await getSetting(policy.key);

  return (
    <div className="px-6 lg:px-12 py-16 lg:py-24 max-w-2xl">
      <h1 className="font-display text-4xl font-light mb-10">{policy.title}</h1>

      {text.trim() ? (
        // A blank line in the textarea becomes a paragraph here.
        <div className="space-y-5">
          {text
            .split(/\n\s*\n/)
            .filter((p) => p.trim())
            .map((paragraph, i) => (
              <p
                key={i}
                className="text-sm text-ink-soft leading-relaxed whitespace-pre-line"
              >
                {paragraph.trim()}
              </p>
            ))}
        </div>
      ) : (
        <p className="text-sm text-ink-soft">
          This policy hasn&apos;t been published yet. Please get in touch if you
          have a question.
        </p>
      )}
    </div>
  );
}