import type { CollectionBeforeChangeHook } from 'payload'

import { computeStatus } from '@/lib/artwork-status'
import { buildSearchText } from '@/lib/search-text'
import type { Artwork } from '@/payload-types'

// status and missing, recomputed on every save from the whole work: the saved document plus what
// changed, so a save that only flips Live still sees every other field (Build Spec 02, Status rule)
export const setStatus: CollectionBeforeChangeHook<Artwork> = ({ data, originalDoc }) => {
  const { status, missing } = computeStatus({ ...originalDoc, ...data })
  return { ...data, status, missing }
}

// searchText: the title being saved plus the stored titles in every other language (Build Spec 07).
// The save only carries the admin's current language, so the others are read with locale 'all'.
// Not passed req: a local API call with a locale overwrites req.locale, and the save would then
// store its title under 'all' instead of the admin's language
export const setSearchText: CollectionBeforeChangeHook<Artwork> = async ({ data, operation, originalDoc, req }) => {
  const titles: Record<string, string | null | undefined> = {}

  if (operation === 'update' && originalDoc?.id) {
    const stored = await req.payload.findByID({
      collection: 'artworks',
      id: originalDoc.id,
      locale: 'all',
      depth: 0,
      select: { title: true },
    })
    Object.assign(titles, stored.title as unknown as Record<string, string | null>)
  }

  // Saving with locale 'all' sends every language at once; otherwise just the current one
  if (data.title !== undefined) {
    if (data.title !== null && typeof data.title === 'object') Object.assign(titles, data.title)
    else if (req.locale) titles[req.locale] = data.title
  }

  return { ...data, searchText: buildSearchText(Object.values(titles)) }
}
