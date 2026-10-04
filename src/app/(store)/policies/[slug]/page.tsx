import { notFound } from "next/navigation";
import { getSetting } from "@/lib/settings";
import { findPolicy, toParagraphs } from "@/lib/policies";

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = findPolicy(slug);
  if (!policy) notFound();

  const paragraphs = toParagraphs(await getSetting(policy.key));

  return (
    <div className="px-6 lg:px-12 py-16 lg:py-24 max-w-2xl">
      <h1 className="font-display text-4xl font-light mb-10">{policy.title}</h1>

      {paragraphs.length > 0 ? (
        <div className="space-y-5">
          {paragraphs.map((paragraph, i) => (
            <p
              key={i}
              className="text-sm text-ink-soft leading-relaxed whitespace-pre-line"
            >
              {paragraph}
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
