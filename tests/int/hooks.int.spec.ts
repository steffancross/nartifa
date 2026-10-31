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
  it('walks incomplete → hidden → live as the work fills in', async () => {
    const work = await createWork({ titleJa: 'status test' })
    expect(work.status).toBe('incomplete')
    expect(work.missing).toHaveLength(7)

    // Live can't be turned on while anything is missing
    const liveWithGaps = await payload.update({
      collection: 'artworks',
      id: work.id,
      data: { live: true, ...senses },
      context,
    })
    expect(liveWithGaps.status).toBe('incomplete')
    expect(liveWithGaps.live).toBe(false)
    expect(liveWithGaps.missing).toEqual(['mainImage'])

    const mainImage = await createImage('status-test.png')
    const complete = await payload.update({ collection: 'artworks', id: work.id, data: { mainImage }, context })
    expect(complete.status).toBe('hidden')
    expect(complete.missing).toEqual([])

    const live = await payload.update({ collection: 'artworks', id: work.id, data: { live: true }, context })
    expect(live.status).toBe('live')
  })

  it('emptying a required field on a live work turns Live off', async () => {
    const mainImage = await createImage('empty-field-test.png')
    const work = await createWork({ ...senses, mainImage, live: true })
    expect(work.status).toBe('live')

    const after = await payload.update({ collection: 'artworks', id: work.id, data: { smell: null }, context })
    expect(after.status).toBe('incomplete')
    expect(after.live).toBe(false)
    expect(after.missing).toEqual(['smell'])
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
  it('makes the work incomplete and turns Live off', async () => {
    const mainImage = await createImage('delete-main-test.png')
    const extra = await createImage('delete-extra-test.png')
    const work = await createWork({ ...senses, mainImage, extraImages: [extra], live: true })
    expect(work.status).toBe('live')

    await payload.delete({ collection: 'media', id: mainImage, context })

    const after = await payload.findByID({ collection: 'artworks', id: work.id, depth: 0 })
    expect(after.mainImage).toBeNull()
    expect(after.live).toBe(false)
    expect(after.status).toBe('incomplete')
    expect(after.missing).toEqual(['mainImage'])
    expect(after.extraImages).toEqual([extra])

    // A new main image makes it complete again; the artist turns Live back on herself
    const back = await payload.update({ collection: 'artworks', id: work.id, data: { mainImage: extra }, context })
    expect(back.status).toBe('hidden')
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

describe('image "In use"', () => {
  const inUse = async (id: number) => (await payload.findByID({ collection: 'media', id, depth: 0 })).inUse

  it('follows the works that use an image, as main or extra', async () => {
    const main = await createImage('usage-main.png')
    const extra = await createImage('usage-extra.png')
    expect(await inUse(main)).toBe(false)

    const work = await createWork({ mainImage: main, extraImages: [extra] })
    expect(await inUse(main)).toBe(true)
    expect(await inUse(extra)).toBe(true)

    // Swapped: the old main image is free again, the extra is now the main one
    await payload.update({ collection: 'artworks', id: work.id, data: { mainImage: extra, extraImages: [] }, context })
    expect(await inUse(main)).toBe(false)
    expect(await inUse(extra)).toBe(true)

    // Still used by a second work after the first is deleted
    await createWork({ extraImages: [extra] })
    await payload.delete({ collection: 'artworks', id: work.id, context })
    expect(await inUse(extra)).toBe(true)
  })

  it("doesn't change the image's updatedAt (its /img version)", async () => {
    const id = await createImage('usage-version.png')
    const before = (await payload.findByID({ collection: 'media', id })).updatedAt
    await createWork({ mainImage: id })
    expect((await payload.findByID({ collection: 'media', id })).updatedAt).toBe(before)
  })
})

describe('artwork titles', () => {
  it('searchText holds both titles; displayTitle is Japanese, else English', async () => {
    const work = await createWork({ titleJa: '夜の庭' })
    expect(work.searchText).toBe('夜の庭')
    expect(work.displayTitle).toBe('夜の庭')

    const both = await payload.update({ collection: 'artworks', id: work.id, data: { titleEn: 'Night Garden' }, context })
    expect(both.searchText).toBe('夜の庭 night garden')
    expect(both.displayTitle).toBe('夜の庭')

    // Editing another field keeps both
    const other = await payload.update({ collection: 'artworks', id: work.id, data: { year: 2026 }, context })
    expect(other.searchText).toBe('夜の庭 night garden')

    // Search finds it by either title
    for (const term of ['夜の庭', 'night']) {
      const { docs } = await payload.find({ collection: 'artworks', where: { searchText: { like: term } } })
      expect(docs.map((d) => d.id)).toContain(work.id)
    }
  })

  it('an English-only work is shown by its English title', async () => {
    const work = await createWork({ titleEn: 'Only English' })
    expect(work.displayTitle).toBe('Only English')

    const cleared = await payload.update({ collection: 'artworks', id: work.id, data: { titleEn: '' }, context })
    expect(cleared.displayTitle).toBe('')
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

describe('collection works list', () => {
  it("lists the works in a collection on the collection's page", async () => {
    const series = await payload.create({ collection: 'series', data: { nameJa: '一覧', nameEn: 'Hooks Test List' }, context })
    created.series.push(series.id)
    const work = await createWork({ titleJa: 'list test', series: [series.id] })

    const found = await payload.findByID({ collection: 'series', id: series.id, depth: 0 })
    expect(found.works?.docs).toEqual([work.id])
  })
})

describe('upload check', () => {
  // Same messages as the admin shows before sending (src/admin/media/FileCheck.tsx)
  const upload = (name: string, mimetype: string, size = png.length) =>
    payload.create({ collection: 'media', data: {}, file: { data: png, mimetype, name, size }, context })

  it('refuses a type other than JPG, PNG or WebP with a clear message', async () => {
    await expect(upload('photo.heic', 'image/heic')).rejects.toThrow('Only JPG, PNG or WebP images can be uploaded')
  })

  it('refuses a file over 20 MB with a clear message', async () => {
    await expect(upload('big.png', 'image/png', 20_000_001)).rejects.toThrow('This file is larger than 20 MB')
  })
})
