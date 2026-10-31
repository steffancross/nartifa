import type { CollectionBeforeChangeHook } from 'payload'

import { computeStatus } from '@/lib/artwork-status'
import { buildSearchText } from '@/lib/search-text'
import type { Artwork } from '@/payload-types'

// Both hooks work on the whole work: the saved document plus what changed, so a save that only
// flips Live (or only changes one title) still sees every other field

// status and missing (Build Spec 02, Status rule). A work with anything missing can't be Live: the
// form greys the switch out, and this turns it off for every other way in (the API, the ⋯ menu, a
// deleted main image)
export const setStatus: CollectionBeforeChangeHook<Artwork> = ({ data, originalDoc }) => {
  const { status, missing } = computeStatus({ ...originalDoc, ...data })
  return missing.length > 0 ? { ...data, live: false, status, missing } : { ...data, status, missing }
}

// displayTitle: Japanese, else English. searchText: both, lower-cased (Build Spec 07)
export const setTitles: CollectionBeforeChangeHook<Artwork> = ({ data, originalDoc }) => {
  const { titleJa, titleEn } = { ...originalDoc, ...data }
  return {
    ...data,
    displayTitle: titleJa?.trim() || titleEn?.trim() || '',
    searchText: buildSearchText([titleJa, titleEn]),
  }
}
