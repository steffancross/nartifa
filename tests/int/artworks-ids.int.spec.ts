// @vitest-environment node
// Payload runs in Node; the jsdom default breaks esbuild (TextEncoder check)
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

// Work ids are permanent URLs (/works/12) and must never be reused, even after deleting the newest
// work (Build Spec 02, Permanent links). Runs against the local database
describe('artworks ids', () => {
  let payload: Payload
  const created: number[] = []
  // Scripts and tests run outside a Next.js request, so they skip cache revalidation (Build Spec 08)
  const context = { skipRevalidate: true }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    for (const id of created) {
      await payload.delete({ collection: 'artworks', id, context }).catch(() => {})
    }
  })

  it('are never reused after deleting the newest work', async () => {
    for (let i = 1; i <= 3; i++) {
      const work = await payload.create({ collection: 'artworks', data: { titleJa: `id test ${i}` }, context })
      created.push(work.id)
    }
    const newest = created[2]
    await payload.delete({ collection: 'artworks', id: newest, context })

    const next = await payload.create({ collection: 'artworks', data: { titleJa: 'id test 4' }, context })
    created.push(next.id)

    expect(next.id).toBeGreaterThan(newest)
  })
})
