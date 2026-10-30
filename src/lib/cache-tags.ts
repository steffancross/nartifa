// The two cache tags (Build Spec 08). One tag per area on purpose: a save clears every page in
// that area, and pages re-render only when next visited
export const CACHE_TAGS = {
  // Anything artwork-related: artwork pages, All Works, the quiz list, artwork 404s
  works: 'works',
  // Globe pins and upload details
  globe: 'globe',
} as const

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]
