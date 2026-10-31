import { APIError, type CollectionAfterDeleteHook, type CollectionBeforeDeleteHook, type CollectionBeforeOperationHook } from 'payload'

import { adminText } from '@/i18n/admin-labels'
import { fileProblem } from '@/lib/images'

// The browser checks a chosen file before sending it (src/admin/media/FileCheck.tsx); this is the
// same check for anything that gets past it, with the same message instead of Payload's
// "The following field is invalid: file"
export const checkUploadedFile: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if ((operation === 'create' || operation === 'update') && req.file) {
    const problem = fileProblem({ name: req.file.name, type: req.file.mimetype, size: req.file.size })
    if (problem) throw new APIError(adminText(`admin.upload.${problem}`, req.i18n?.language), 400, null, true)
  }
  return args
}

// Deleting an image is always allowed. A work that used it as its main image comes off the site:
// it is re-saved with no main image, so it becomes incomplete and Live turns off (setStatus) until
// a new one is chosen and the artist turns Live back on.
// The database empties the field by itself (ON DELETE set null) but that wouldn't recompute the
// status. Extra images need nothing: the database drops them from the list (Build Spec 02)
const contextKey = (id: number | string) => `mainImageOf:${id}`

// Before the delete, while the works still point at the image
export const findWorksUsingImage: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { docs } = await req.payload.find({
    collection: 'artworks',
    where: { mainImage: { equals: id } },
    depth: 0,
    pagination: false,
    req,
  })
  req.context[contextKey(id)] = docs.map((work) => work.id)
}

export const clearMainImage: CollectionAfterDeleteHook = async ({ id, req }) => {
  const workIds = (req.context[contextKey(id)] as number[] | undefined) ?? []
  for (const workId of workIds) {
    await req.payload.update({ collection: 'artworks', id: workId, data: { mainImage: null }, req })
  }
}
