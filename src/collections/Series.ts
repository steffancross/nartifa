import type { CollectionConfig } from 'payload'

import { revalidateOnChange } from '@/hooks/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'

// The artist's "collections" (Build Spec 02). Slug "series" because "collections" is Payload's own
// word for every content type; the admin only ever says Collections / コレクション.
// Not on the public site in v1 (the graphic is paused); built now so the data is ready
export const Series: CollectionConfig = {
  slug: 'series',
  labels: {
    singular: { en: 'Collection', ja: 'コレクション' },
    plural: { en: 'Collections', ja: 'コレクション' },
  },
  admin: {
    useAsTitle: 'name',
  },
  hooks: revalidateOnChange(CACHE_TAGS.works),
  fields: [
    {
      name: 'name',
      type: 'text',
      localized: true,
      required: true,
      label: { en: 'Name', ja: '名前' },
    },
    {
      // For the future collection graphic. Filled from the name by a hook (next chunk)
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      label: { en: 'Slug', ja: 'スラッグ' },
      admin: { position: 'sidebar' },
    },
  ],
}
