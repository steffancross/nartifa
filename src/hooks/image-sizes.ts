import { APIError, type CollectionAfterChangeHook, type CollectionAfterDeleteHook, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { ORIENTATION_SIZE, type ImageCollection, type ImageSize } from '@/config/images'
import { adminLabel } from '@/i18n/admin-labels'
import { getCloudflareEnv } from '@/lib/cloudflare'
import {
  isTooLargeError,
  makeSizes,
  outputDimensions,
  type ImageBytes,
} from '@/lib/image-transform'
import { derivedKey, derivedPrefix, exceedsPixelLimit, needsOrientationSwap, sizesFor } from '@/lib/images'

// Every named size, made once when a file is uploaded or replaced (Build Spec 05):
// - beforeChange makes them all through the Images binding and keeps them in req.context. Any
//   failure throws, so the upload is rejected with a message and nothing is saved (D1 has no
//   transactions, and the R2 plugin only stores the original after this, in afterChange)
// - afterChange: the id exists now; write each to derived/{collection}/{id}/{size}.webp
// - afterDelete: remove derived/{collection}/{id}/. The R2 plugin deletes the original itself

const contextKey = (collection: ImageCollection) => `imageSizes:${collection}`

// The admin's own language for the rejection message
const message = (req: PayloadRequest, key: 'tooLarge' | 'failed') =>
  adminLabel(`admin.images.${key}`)[req.i18n?.language === 'ja' ? 'ja' : 'en']

const reject = (req: PayloadRequest, key: 'tooLarge' | 'failed') => new APIError(message(req, key), 400, null, true)

export function imageSizeHooks(collection: ImageCollection): {
  beforeChange: CollectionBeforeChangeHook
  afterChange: CollectionAfterChangeHook
  afterDelete: CollectionAfterDeleteHook
} {
  return {
    beforeChange: async ({ data, req }) => {
      // Only when a file comes with this save (upload or replace), not when other fields change
      if (!req.file?.data) return data

      // Payload has read width/height from the file header. Checked here because the local
      // runtime has no limit and would process it anyway
      if (exceedsPixelLimit(data)) throw reject(req, 'tooLarge')

      const { IMAGES } = await getCloudflareEnv()
      const original = new Uint8Array(req.file.data) as ImageBytes
      let sizes: Map<ImageSize, ImageBytes>
      try {
        sizes = await makeSizes(IMAGES, original, sizesFor(collection))
      } catch (error) {
        req.payload.logger.error({ err: error, msg: `Image sizes failed for ${req.file.name}` })
        throw reject(req, isTooLargeError(error) ? 'tooLarge' : 'failed')
      }

      // Payload records a sideways phone photo unrotated; the binding outputs it upright. Store
      // the shape that is actually served, so placeholders match (05, Placeholders)
      const served = await outputDimensions(IMAGES, sizes.get(ORIENTATION_SIZE)!)
      if (served && needsOrientationSwap(data, served)) {
        ;[data.width, data.height] = [data.height, data.width]
      }

      req.context[contextKey(collection)] = sizes
      return data
    },

    afterChange: async ({ doc, req }) => {
      const sizes = req.context[contextKey(collection)] as Map<ImageSize, ImageBytes> | undefined
      if (!sizes) return doc
      delete req.context[contextKey(collection)]

      const { R2 } = await getCloudflareEnv()
      for (const [size, bytes] of sizes) {
        // As a Blob: a typed array doesn't survive the local dev proxy (workers-sdk#6047)
        await R2.put(derivedKey(collection, doc.id, size), new Blob([bytes]), {
          httpMetadata: { contentType: 'image/webp' },
        })
      }
      return doc
    },

    afterDelete: async ({ id }) => {
      const { R2 } = await getCloudflareEnv()
      const { objects } = await R2.list({ prefix: derivedPrefix(collection, Number(id)) })
      if (objects.length > 0) await R2.delete(objects.map((object) => object.key))
    },
  }
}
