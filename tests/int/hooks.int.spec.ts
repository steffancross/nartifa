// @vitest-environment node
// Payload runs in Node; the jsdom default breaks esbuild (TextEncoder check)
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

// The Phase 1 hooks against the local database through Payload's local API (Build Spec 02, 07)
let payload: Payload
// Tests run outside a Next.js request, so they skip cache revalidation (Build Spec 08)
const context = { skipRevalidate: true }
const created = { artworks: [] as number[], series: [] as number[], media: [] as number[] }

// 1×1 transparent PNG
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

const createImage = async (name: string) => {
  const image = await payload.create({
    collection: 'media',
    data: {},
    file: { data: png, mimetype: 'image/png', name, size: png.length },
    context,
  })
  created.media.push(image.id)
  return image.id
}

const createWork = async (data: Record<string, unknown>) => {
  const work = await payload.create({ collection: 'artworks', data, context })
  created.artworks.push(work.id)
  return work
}

const senses = { sight: 'a', smell: 'b', taste: 'a', touch: 'b', hearing: 'a', feeling: 'joy' } as const

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})

afterAll(async () => {
  for (const [collection, ids] of Object.entries(created) as [keyof typeof created, number[]][]) {
    for (const id of ids) await payload.delete({ collection, id, context }).catch(() => {})
  }
})

describe('artwork status', () => {
  it('walks hidden → incomplete → live as the work fills in', async () => {
    const work = await createWork({ title: 'status test' })
    expect(work.status).toBe('hidden')
    expect(work.missing).toHaveLength(7)

    const liveWithGaps = await payload.update({
      collection: 'artworks',
      id: work.id,
      data: { live: true, ...senses },
      context,
    })
    expect(liveWithGaps.status).toBe('incomplete')
    expect(liveWithGaps.missing).toEqual(['mainImage'])

    const mainImage = await createImage('status-test.png')
    const complete = await payload.update({ collection: 'artworks', id: work.id, data: { mainImage }, context })
    expect(complete.status).toBe('live')
    expect(complete.missing).toEqual([])
  })

  it('a save that only flips Live still sees every other field', async () => {
    const mainImage = await createImage('live-flip-test.png')
    const work = await createWork({ ...senses, mainImage, live: true })
    expect(work.status).toBe('live')

    const off = await payload.update({ collection: 'artworks', id: work.id, data: { live: false }, context })
    expect(off.status).toBe('hidden')
    expect(off.missing).toEqual([])

    const on = await payload.update({ collection: 'artworks', id: work.id, data: { live: true }, context })
    expect(on.status).toBe('live')
  })
})

describe('deleting a main image', () => {
  it('takes the work off the site but leaves Live ticked', async () => {
    const mainImage = await createImage('delete-main-test.png')
    const extra = await createImage('delete-extra-test.png')
    const work = await createWork({ ...senses, mainImage, extraImages: [extra], live: true })
    expect(work.status).toBe('live')

    await payload.delete({ collection: 'media', id: mainImage, context })

    const after = await payload.findByID({ collection: 'artworks', id: work.id, depth: 0 })
    expect(after.mainImage).toBeNull()
    expect(after.live).toBe(true)
    expect(after.status).toBe('incomplete')
    expect(after.missing).toEqual(['mainImage'])
    expect(after.extraImages).toEqual([extra])

    // Choosing a new main image puts it straight back
    const back = await payload.update({ collection: 'artworks', id: work.id, data: { mainImage: extra }, context })
    expect(back.status).toBe('live')
  })

  it('deleting an extra image leaves the work as it was', async () => {
    const mainImage = await createImage('extra-only-main-test.png')
    const extra = await createImage('extra-only-extra-test.png')
    const work = await createWork({ ...senses, mainImage, extraImages: [extra], live: true })

    await payload.delete({ collection: 'media', id: extra, context })

    const after = await payload.findByID({ collection: 'artworks', id: work.id, depth: 0 })
    expect(after.status).toBe('live')
    expect(after.extraImages).toEqual([])
  })
})

describe('artwork searchText', () => {
  it('holds both titles after saving in ja then en', async () => {
    const work = await createWork({ title: '夜の庭' })
    expect(work.searchText).toBe('夜の庭')

    const en = await payload.update({
      collection: 'artworks',
      id: work.id,
      locale: 'en',
      data: { title: 'Night Garden' },
      context,
    })
    expect(en.searchText).toBe('夜の庭 night garden')
    // …and the English title itself was stored in English (the hook's own lookup mustn't change the
    // save's language)
    const enTitle = await payload.findByID({ collection: 'artworks', id: work.id, locale: 'en', fallbackLocale: false })
    expect(enTitle.title).toBe('Night Garden')

    // Editing another field in either language keeps both
    const other = await payload.update({ collection: 'artworks', id: work.id, data: { year: 2026 }, context })
    expect(other.searchText).toBe('夜の庭 night garden')

    // Search finds it by either title
    for (const term of ['夜の庭', 'night']) {
      const { docs } = await payload.find({ collection: 'artworks', where: { searchText: { like: term } } })
      expect(docs.map((d) => d.id)).toContain(work.id)
    }
  })
})

describe('collection slug', () => {
  const createSeries = async (data: { nameJa: string; nameEn: string }) => {
    const series = await payload.create({ collection: 'series', data, context })
    created.series.push(series.id)
    return series
  }

  it('comes from the English name and is made unique', async () => {
    const first = await createSeries({ nameJa: '夜の庭', nameEn: 'Hooks Test Garden' })
    const second = await createSeries({ nameJa: '夜の庭 2', nameEn: 'Hooks Test Garden' })
    expect(first.slug).toBe('hooks-test-garden')
    expect(second.slug).toBe('hooks-test-garden-2')
  })

  it('follows the English name, and keeps its own slug on a resave', async () => {
    const series = await createSeries({ nameJa: '海', nameEn: 'Hooks Test Sea' })
    const resaved = await payload.update({ collection: 'series', id: series.id, data: { nameJa: '海辺' }, context })
    expect(resaved.slug).toBe('hooks-test-sea')

    const renamed = await payload.update({
      collection: 'series',
      id: series.id,
      data: { nameEn: 'Hooks Test Shore' },
      context,
    })
    expect(renamed.slug).toBe('hooks-test-shore')
  })

  it('needs both names', async () => {
    await expect(
      payload.create({ collection: 'series', data: { nameJa: '名前だけ' } as never, context }),
    ).rejects.toThrow()
  })
})
