// @vitest-environment node
// Payload runs in Node; the jsdom default breaks esbuild (TextEncoder check)
import fs from 'node:fs'
import path from 'node:path'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { GET } from '@/app/img/[...path]/route'
import { IMAGE_COLLECTIONS } from '@/config/images'
import { getCloudflareEnv } from '@/lib/cloudflare'
import { derivedKey, derivedPrefix } from '@/lib/images'
import config from '@/payload.config'

// The image pipeline against the local database, local R2 and the local Images binding (Build Spec 05)
let payload: Payload
let env: CloudflareEnv
const context = { skipRevalidate: true }
const created: number[] = []

const fixture = (name: string, mimetype: string) => {
  const data = fs.readFileSync(path.resolve(__dirname, '../fixtures', name))
  return { data, mimetype, name: `images-test-${name}`, size: data.length }
}

const upload = async (name: string, mimetype: string) => {
  const image = await payload.create({ collection: 'media', data: {}, file: fixture(name, mimetype), context })
  created.push(image.id)
  return image
}

const derivedKeys = async (id: number) =>
  (await env.R2.list({ prefix: derivedPrefix('media', id) })).objects.map((o) => o.key).sort()

const dimensionsOf = async (key: string) => {
  const object = await env.R2.get(key)
  const info = await env.IMAGES.info(new Blob([await object!.arrayBuffer()]).stream())
  return 'width' in info ? { width: info.width, height: info.height, format: info.format } : null
}

const route = (...segments: string[]) =>
  GET(new Request(`http://localhost/img/${segments.join('/')}`), { params: Promise.resolve({ path: segments }) })

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  env = await getCloudflareEnv()
})

afterAll(async () => {
  for (const id of created) await payload.delete({ collection: 'media', id, context }).catch(() => {})
})

describe('upload', () => {
  it('makes every size, and stores a sideways phone photo as portrait', async () => {
    const image = await upload('portrait-phone.jpg', 'image/jpeg')

    expect(await derivedKeys(image.id)).toEqual(IMAGE_COLLECTIONS.media.map((size) => derivedKey('media', image.id, size)).sort())
    // Payload read 4032×3024 from the header; the hook swapped it to the shape that is served
    expect([image.width, image.height]).toEqual([3024, 4032])

    expect(await dimensionsOf(derivedKey('media', image.id, 'lg'))).toEqual({ width: 1600, height: 2133, format: 'image/webp' })
    expect(await dimensionsOf(derivedKey('media', image.id, 'thumb'))).toMatchObject({ width: 200, height: 200 })
    expect(await dimensionsOf(derivedKey('media', image.id, 'og'))).toMatchObject({ width: 1200, height: 630 })
  })

  it('never upscales a small image', async () => {
    const image = await upload('small.png', 'image/png')
    expect([image.width, image.height]).toEqual([300, 200])
    expect(await dimensionsOf(derivedKey('media', image.id, 'xl'))).toMatchObject({ width: 300, height: 200 })
    expect(await dimensionsOf(derivedKey('media', image.id, 'card'))).toMatchObject({ width: 600, height: 600 })
  })

  it('rejects an image over 100 MP with the message, and saves nothing', async () => {
    const before = await payload.count({ collection: 'media' })
    await expect(upload('huge-144mp.png', 'image/png')).rejects.toThrow(/too large to process/)
    expect(await payload.count({ collection: 'media' })).toEqual(before)
    expect((await env.R2.list({ prefix: 'media/images-test-huge' })).objects).toEqual([])
  })

  it('replacing the file remakes its sizes', async () => {
    const image = await upload('portrait-phone.jpg', 'image/jpeg')
    const replaced = await payload.update({
      collection: 'media',
      id: image.id,
      data: {},
      file: fixture('small.png', 'image/png'),
      context,
    })
    expect([replaced.width, replaced.height]).toEqual([300, 200])
    expect(await dimensionsOf(derivedKey('media', image.id, 'lg'))).toMatchObject({ width: 300, height: 200 })
  })

  it('saving without a new file leaves the sizes alone', async () => {
    const image = await upload('small.png', 'image/png')
    const before = await env.R2.head(derivedKey('media', image.id, 'lg'))
    await payload.update({ collection: 'media', id: image.id, data: {}, context })
    expect((await env.R2.head(derivedKey('media', image.id, 'lg')))?.etag).toBe(before?.etag)
  })
})

describe('delete', () => {
  it('removes the derived files and the original', async () => {
    const image = await upload('small.png', 'image/png')
    expect(await derivedKeys(image.id)).toHaveLength(IMAGE_COLLECTIONS.media.length)

    await payload.delete({ collection: 'media', id: image.id, context })
    expect(await derivedKeys(image.id)).toEqual([])
    expect(await env.R2.head(`media/${image.filename}`)).toBeNull()
  })
})

describe('image route', () => {
  it('serves a stored size as WebP, cached for a year', async () => {
    const image = await upload('small.png', 'image/png')
    const response = await route('media', String(image.id), 'card')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/webp')
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    const info = await env.IMAGES.info(new Blob([await response.arrayBuffer()]).stream())
    expect(info).toMatchObject({ width: 600, height: 600 })
  })

  it('rebuilds a missing size from the original and stores it', async () => {
    const image = await upload('portrait-phone.jpg', 'image/jpeg')
    const key = derivedKey('media', image.id, 'md')
    await env.R2.delete(key)

    const response = await route('media', String(image.id), 'md')
    expect(response.status).toBe(200)
    expect(await env.IMAGES.info(new Blob([await response.arrayBuffer()]).stream())).toMatchObject({ width: 800 })
    expect(await env.R2.head(key)).not.toBeNull()
  })

  it.each([
    ['unknown size', ['media', '1', 'huge']],
    ['unknown collection', ['users', '1', 'thumb']],
    ['globe photos (not built yet)', ['globe-photos', '1', 'thumb']],
    ['bad id', ['media', 'abc', 'lg']],
    ['no such image', ['media', '999999999', 'lg']],
  ])('404 for %s', async (_, segments) => {
    const response = await route(...segments)
    expect(response.status).toBe(404)
  })
})
