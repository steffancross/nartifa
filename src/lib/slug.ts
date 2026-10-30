// A URL-safe slug from an English name: "Night Garden (II)" → "night-garden-ii". Accents are
// dropped (Café → cafe); anything else that isn't a-z or 0-9 becomes a single "-"
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// First of base, base-2, base-3… that isTaken says is free
export async function uniqueSlug(base: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`
    if (!(await isTaken(candidate))) return candidate
  }
}
