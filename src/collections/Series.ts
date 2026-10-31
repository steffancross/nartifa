import type { CollectionConfig } from 'payload'

import { ADMIN_GROUP, ITEM_PAGE_COMPONENTS } from '@/config/admin'
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
    group: ADMIN_GROUP,
    useAsTitle: 'nameJa',
    defaultColumns: ['nameJa', 'nameEn', 'slug'],
    listSearchableFields: ['nameJa', 'nameEn'],
    hideAPIURL: true,
    components: ITEM_PAGE_COMPONENTS,
  },
  // An item's page is just its form (src/config/admin.ts)
  disableDuplicate: true,
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
    {
      // The works in this collection, listed on its page. Read from artworks.series, not stored
      name: 'works',
      type: 'join',
      collection: 'artworks',
      on: 'series',
      label: { en: 'Works in this collection', ja: 'このコレクションの作品' },
      admin: { allowCreate: false, defaultColumns: ['displayTitle', 'status'] },
    },
  ],
}
