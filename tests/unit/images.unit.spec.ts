import { describe, expect, it } from 'vitest'

import { IMAGE_COLLECTIONS, IMAGE_SIZES, ORIENTATION_SIZE } from '@/config/images'
import {
  derivedKey,
  exceedsPixelLimit,
  fileProblem,
  imageUrl,
  needsOrientationSwap,
  parseImagePath,
} from '@/lib/images'

describe('image config (Build Spec 05)', () => {
  it('artwork images get every size', () => {
    expect([...IMAGE_COLLECTIONS.media].sort()).toEqual(Object.keys(IMAGE_SIZES).sort())
  })

  it('the orientation fix reads a natural-shape size', () => {
    expect(IMAGE_SIZES[ORIENTATION_SIZE].fit).toBe('scale-down')
  })
})

describe('imageUrl', () => {
  it('adds the version from updatedAt', () => {
    expect(imageUrl('media', { id: 12, updatedAt: '2026-10-30T00:00:00.000Z' }, 'lg')).toBe(
      `/img/media/12/lg?v=${Date.parse('2026-10-30T00:00:00.000Z')}`,
    )
  })

  it('leaves it off when there is no date', () => {
    expect(imageUrl('media', { id: 12 }, 'thumb')).toBe('/img/media/12/thumb')
  })
})

describe('derivedKey', () => {
  it('is derived/{collection}/{id}/{size}.webp', () => {
    expect(derivedKey('media', 12, 'card')).toBe('derived/media/12/card.webp')
  })
})

describe('parseImagePath', () => {
  it('accepts a known collection, id and size', () => {
    expect(parseImagePath(['media', '12', 'lg'])).toEqual({ collection: 'media', id: 12, size: 'lg' })
  })

  it.each([
    [['media', '12']],
    [['media', '12', 'lg', 'extra']],
    [['globe-photos', '1', 'thumb']],
    [['users', '1', 'thumb']],
    [['media', '0', 'lg']],
    [['media', '012', 'lg']],
    [['media', '1.5', 'lg']],
    [['media', 'abc', 'lg']],
    [['media', '12', 'huge']],
    [['media', '12', 'toString']],
    [['__proto__', '1', 'lg']],
  ])('rejects %j', (segments) => {
    expect(parseImagePath(segments)).toBeNull()
  })
})

describe('exceedsPixelLimit', () => {
  it.each([
    [{ width: 10000, height: 10000 }, false],
    [{ width: 10000, height: 10001 }, true],
    [{ width: 12000, height: 12000 }, true],
    [{ width: 50001, height: 10 }, true],
    [{ width: 50000, height: 10 }, false],
    [{ width: null, height: null }, false],
  ])('%j → %s', (dimensions, expected) => {
    expect(exceedsPixelLimit(dimensions)).toBe(expected)
  })
})

describe('needsOrientationSwap', () => {
  it('stored landscape, served portrait → swap (sideways phone photo)', () => {
    expect(needsOrientationSwap({ width: 4032, height: 3024 }, { width: 1600, height: 2133 })).toBe(true)
  })

  it('same shape → no swap', () => {
    expect(needsOrientationSwap({ width: 3024, height: 4032 }, { width: 1600, height: 2133 })).toBe(false)
    expect(needsOrientationSwap({ width: 300, height: 200 }, { width: 300, height: 200 })).toBe(false)
  })

  it('squares and missing values → no swap', () => {
    expect(needsOrientationSwap({ width: 500, height: 500 }, { width: 500, height: 500 })).toBe(false)
    expect(needsOrientationSwap({ width: null, height: 10 }, { width: 10, height: 20 })).toBe(false)
  })
})

describe('fileProblem (upload check, Build Spec 05)', () => {
  it('accepts JPG, PNG and WebP up to 20 MB', () => {
    expect(fileProblem({ name: 'a.jpg', type: 'image/jpeg', size: 20_000_000 })).toBeNull()
    expect(fileProblem({ name: 'a.webp', type: 'image/webp', size: 1 })).toBeNull()
  })

  it('refuses other types, by extension when the browser gives none', () => {
    expect(fileProblem({ name: 'a.heic', type: 'image/heic', size: 1 })).toBe('wrongType')
    expect(fileProblem({ name: 'a.HEIC', type: '', size: 1 })).toBe('wrongType')
    expect(fileProblem({ name: 'a.PNG', type: '', size: 1 })).toBeNull()
  })

  it('refuses files over 20 MB', () => {
    expect(fileProblem({ name: 'a.jpg', type: 'image/jpeg', size: 20_000_001 })).toBe('tooBig')
  })
})
