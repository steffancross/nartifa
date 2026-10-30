import type { CollectionConfig } from 'payload'

import { revalidateOnChange } from '@/hooks/revalidate'
import { setSlug } from '@/hooks/series'
import { CACHE_TAGS } from '@/lib/cache-tags'

// The artist's "collections" (Build Spec 02). Slug "series" because "collections" is Payload's own
// word for every content type; the admin only ever says Collections / コレクション.
// Not on the public site in v1 (the graphic is paused); built now so the data is ready.
// Both names are plain required fields rather than one localized field, so a collection can't be
// added (even from the picker on a work) without both; the admin form shows one language at a time
export const Series: CollectionConfig = {
  slug: 'series',
  labels: {
    singular: { en: 'Collection', ja: 'コレクション' },
    plural: { en: 'Collections', ja: 'コレクション' },
  },
  admin: {
    useAsTitle: 'nameJa',
    defaultColumns: ['nameJa', 'nameEn', 'slug'],
    listSearchableFields: ['nameJa', 'nameEn'],
  },
  hooks: {
    beforeChange: [setSlug],
    ...revalidateOnChange(CACHE_TAGS.works),
  },
  fields: [
    {
      name: 'nameJa',
      type: 'text',
      required: true,
      label: { en: 'Name (Japanese)', ja: '名前（日本語）' },
    },
    {
      name: 'nameEn',
      type: 'text',
      required: true,
      label: { en: 'Name (English)', ja: '名前（英語）' },
    },
    {
      // From the English name, for the future collection graphic (src/hooks/series.ts)
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      label: { en: 'Slug', ja: 'スラッグ' },
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
