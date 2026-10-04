import { getSetting } from "@/lib/settings";

/**
 * The policy texts, written by the admin on the Policies page and stored in
 * settings. One list, used by the policy pages and the product page, so a new
 * policy only has to be added here.
 */
export const POLICIES = [
  { slug: "returns", key: "policyReturns", title: "Returns policy" },
  { slug: "terms", key: "policyTerms", title: "Terms of sale" },
  { slug: "privacy", key: "policyPrivacy", title: "Privacy policy" },
] as const;

export type PolicySlug = (typeof POLICIES)[number]["slug"];

export function findPolicy(slug: string) {
  return POLICIES.find((p) => p.slug === slug) ?? null;
}

/** A blank line in the admin's textarea starts a new paragraph. */
export function toParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** The given policies with their text, leaving out any not written yet. */
export async function getPublishedPolicies(slugs: PolicySlug[]) {
  const list = POLICIES.filter((p) => slugs.includes(p.slug));
  const texts = await Promise.all(list.map((p) => getSetting(p.key)));
  return list
    .map((p, i) => ({ slug: p.slug, title: p.title, paragraphs: toParagraphs(texts[i]) }))
    .filter((p) => p.paragraphs.length > 0);
}
