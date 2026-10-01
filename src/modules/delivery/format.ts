// Pure helpers - safe for client components.

/** ["Cairo"] -> "Cairo";  ["Cairo","Giza","Alexandria"] -> "Cairo, Giza and Alexandria" */
export function joinAreas(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
