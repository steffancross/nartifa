// Named image sizes (Build Spec 05). Every size of every image is made once, at upload, through the
// Images binding and kept in R2 under derived/. Adding a size here is enough: the image route makes
// it from the original the first time it's requested (check the transformation count first, 05)

export const IMAGE_SIZES = {
  // Exact squares: thumbnails, admin tables, review queue
  thumb: { width: 200, height: 200, fit: 'cover' },
  // Exact square: All Works grid
  card: { width: 600, height: 600, fit: 'cover' },
  // Natural shape, never upscaled: artwork / photo on phones
  md: { width: 800, fit: 'scale-down' },
  // Desktop, reveal. Also the size the orientation fix reads (ORIENTATION_SIZE)
  lg: { width: 1600, fit: 'scale-down' },
  // Full-screen artwork viewer only
  xl: { width: 2400, fit: 'scale-down' },
  // Social share image, padded so the artwork is never cropped. #0D0D0D = the site background
  og: { width: 1200, height: 630, fit: 'pad', background: '#0D0D0D' },
} as const satisfies Record<string, ImageTransform>

export type ImageSize = keyof typeof IMAGE_SIZES

// WebP drops all metadata (EXIF, GPS) on output
export const IMAGE_OUTPUT = { format: 'image/webp', quality: 85 } as const

// Collections served through /img and the sizes each one gets. Every artwork image gets all six: an
// image doesn't know at upload whether it will be a main or an extra image. globe-photos joins in
// the globe phase with thumb, md, lg
export const IMAGE_COLLECTIONS = {
  media: ['thumb', 'card', 'md', 'lg', 'xl', 'og'],
} as const satisfies Record<string, readonly ImageSize[]>

export type ImageCollection = keyof typeof IMAGE_COLLECTIONS

// The natural-shape size whose output shape is compared with the stored width/height (05, Placeholders)
export const ORIENTATION_SIZE = 'lg' satisfies ImageSize

// The Images binding's input limits on Cloudflare (error 9413). The local runtime has none, so the
// upload hook checks them itself
export const IMAGE_LIMITS = { maxPixels: 100_000_000, maxSide: 50_000 }

export const IMAGE_CACHE_CONTROL = {
  // ?v= changes whenever the image is replaced, so a year is safe
  media: 'public, max-age=31536000, immutable',
} as const satisfies Record<ImageCollection, string>
