import type { CollectionConfig } from 'payload'

import { revalidateOnChange } from '@/hooks/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  hooks: revalidateOnChange(CACHE_TAGS.works),
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    // These are not supported on Workers yet due to lack of sharp
    crop: false,
    focalPoint: false,
  },
}
