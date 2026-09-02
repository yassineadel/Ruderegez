/**
 * "Fine Chain Bracelet" -> "fine-chain-bracelet"
 *
 * Pure string work with no imports, so it is safe on both sides of the
 * client/server boundary. It lives alone for exactly that reason: putting it
 * in products-service.ts would drag Prisma and argon2 into the browser bundle
 * through a single import.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}