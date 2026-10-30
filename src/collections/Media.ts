import type { CollectionConfig } from 'payload'

import { revalidateOnChange } from '@/hooks/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'

// Artwork images (Build Spec 02, 05). Originals live in R2 under media/ (prefix set in
// payload.config.ts) and are never public: the site serves only the named sizes through /img.
// No alt field: alt text is generated from the artwork title
export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { en: 'Image', ja: '画像' },
    plural: { en: 'Images', ja: '画像' },
  },
  access: {
    // Logged-in admins only, so /api/media/file/... can't hand out full-resolution originals.
    // Public pages read media through Payload's local API, which skips access rules
    read: ({ req }) => Boolean(req.user),
  },
  hooks: revalidateOnChange(CACHE_TAGS.works),
  fields: [],
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    // Not supported on Workers (no sharp); sizes come from the Images binding instead (Build Spec 05)
    crop: false,
    focalPoint: false,
  },
}
