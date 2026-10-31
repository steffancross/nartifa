import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import type { Artwork } from '@/payload-types'

// media.inUse: whether any work uses the image as its main or an extra image. Stored (not worked
// out per request) so the Images list can filter on it with Payload's own filter: its filter panel
// can't show a filter on the join fields. Refreshed for every image a work gained or lost on each
// artwork save and delete. Written straight to the database with its old updatedAt, so the image's
// /img ?v= doesn't change and no image hooks run

type ImageRef = Artwork['mainImage']

const imageIds = (work: Partial<Artwork> | null | undefined): number[] => {
  const refs: ImageRef[] = [work?.mainImage, ...(work?.extraImages ?? [])]
  return refs
    .map((ref) => (ref && typeof ref === 'object' ? ref.id : ref))
    .filter((id): id is number => typeof id === 'number')
}

export async function refreshImageUsage(req: PayloadRequest, ids: number[]): Promise<void> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return

  // Images that still exist (one may be the image being deleted right now)
  const { docs } = await req.payload.find({
    collection: 'media',
    where: { id: { in: unique } },
    depth: 0,
    pagination: false,
    select: { inUse: true, updatedAt: true },
    req,
  })

  for (const { id, inUse, updatedAt } of docs) {
    const { totalDocs } = await req.payload.count({
      collection: 'artworks',
      where: { or: [{ mainImage: { equals: id } }, { extraImages: { in: [id] } }] },
      req,
    })
    const used = totalDocs > 0
    if (used === inUse) continue
    // updatedAt passed back unchanged: the adapter would otherwise set it to now
    await req.payload.db.updateOne({ collection: 'media', id, data: { inUse: used, updatedAt }, req, returning: false })
  }
}

export const refreshUsageAfterSave: CollectionAfterChangeHook<Artwork> = async ({ doc, previousDoc, req }) => {
  await refreshImageUsage(req, [...imageIds(doc), ...imageIds(previousDoc)])
  return doc
}

export const refreshUsageAfterDelete: CollectionAfterDeleteHook<Artwork> = async ({ doc, req }) => {
  await refreshImageUsage(req, imageIds(doc))
  return doc
}
