// Pure - safe for client components.

/**
 * An admin-typed link for an IMAGE card. Either a path on this site
 * ("/products?type=rings") or an https address. Nothing else - no
 * "javascript:", no protocol-relative "//evil.com".
 */
export function isSafeLink(url: string): boolean {
  if (url.startsWith("/")) return !url.startsWith("//") && !url.startsWith("/\\");
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export function isExternal(url: string): boolean {
  return url.startsWith("https://");
}
