import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { CACHE_TAGS } from './cache-tags'

// ALL public reads go through this file: Payload's local API wrapped in unstable_cache with a tag,
// so a page only calls Payload on a cache miss, and a save clears it (Build Spec 08).
// unstable_cache, not 'use cache': that needs cacheComponents, which stays off (Build Spec 00)

// Phase 0 example read, shown on the landing placeholder. Goes when the real landing is built
export const getMediaCount = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const { totalDocs } = await payload.count({ collection: 'media' })
    return totalDocs
  },
  ['media-count'],
  { tags: [CACHE_TAGS.works] },
)
