import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import type { CacheTag } from '@/lib/cache-tags'

// Clears a cache tag whenever a collection's documents are saved or deleted, so the next visitor
// gets a fresh page (Build Spec 08). { expire: 0 }: stale content is never served after a save.
// Scripts set req.context.skipRevalidate, since revalidateTag only works inside a Next.js request
export function revalidateOnChange(tag: CacheTag): {
  afterChange: CollectionAfterChangeHook[]
  afterDelete: CollectionAfterDeleteHook[]
} {
  const clear = (req: PayloadRequest) => {
    if (req.context.skipRevalidate) return
    revalidateTag(tag, { expire: 0 })
  }

  return {
    afterChange: [
      ({ doc, req }) => {
        clear(req)
        return doc
      },
    ],
    afterDelete: [
      ({ doc, req }) => {
        clear(req)
        return doc
      },
    ],
  }
}
