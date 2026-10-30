// One lower-cased string holding every language's title, so the admin search box finds a work by
// either title whichever admin language is in use (Build Spec 07)
export function buildSearchText(titles: (string | null | undefined)[]): string {
  const words = titles.map((title) => title?.trim().toLowerCase()).filter((title): title is string => !!title)
  return [...new Set(words)].join(' ')
}
