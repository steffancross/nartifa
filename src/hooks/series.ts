import type { CollectionBeforeChangeHook } from 'payload'

import { slugify, uniqueSlug } from '@/lib/slug'
import type { Series } from '@/payload-types'

// The slug always follows the English name, made unique with -2, -3… (Build Spec 02). Nothing links
// to it yet (the collection graphic is paused); decide whether to freeze it when the graphic ships
export const setSlug: CollectionBeforeChangeHook<Series> = async ({ data, originalDoc, req }) => {
  const nameEn = data.nameEn ?? originalDoc?.nameEn ?? ''
  const base = slugify(nameEn) || 'collection'

  const slug = await uniqueSlug(base, async (candidate) => {
    const { totalDocs } = await req.payload.count({
      collection: 'series',
      where: {
        slug: { equals: candidate },
        ...(originalDoc?.id ? { id: { not_equals: originalDoc.id } } : {}),
      },
      req,
    })
    return totalDocs > 0
  })

  return { ...data, slug }
}
