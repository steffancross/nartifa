import { describe, expect, it } from 'vitest'

import { slugify, uniqueSlug } from '@/lib/slug'

describe('slugify', () => {
  it.each([
    ['Night Garden', 'night-garden'],
    ['  Night   Garden  ', 'night-garden'],
    ['Night Garden (II)', 'night-garden-ii'],
    ['Café Crème', 'cafe-creme'],
    ["Artist's Room — 2026", 'artist-s-room-2026'],
    ['夜の庭', ''],
    ['!!!', ''],
  ])('%s → %s', (name, slug) => {
    expect(slugify(name)).toBe(slug)
  })
})

describe('uniqueSlug', () => {
  const takenIn = (taken: string[]) => async (slug: string) => taken.includes(slug)

  it('keeps the base when it is free', async () => {
    expect(await uniqueSlug('night-garden', takenIn([]))).toBe('night-garden')
  })

  it('adds -2, -3… when taken', async () => {
    expect(await uniqueSlug('night-garden', takenIn(['night-garden']))).toBe('night-garden-2')
    expect(await uniqueSlug('night-garden', takenIn(['night-garden', 'night-garden-2']))).toBe('night-garden-3')
  })
})
