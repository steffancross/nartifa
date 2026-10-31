import { describe, expect, it } from 'vitest'

import { REQUIRED_FIELDS } from '@/config/artworks'
import { computeStatus } from '@/lib/artwork-status'

// Every required field filled in
const complete = {
  sight: 'a',
  smell: 'b',
  taste: 'a',
  touch: 'b',
  hearing: 'a',
  feeling: 'joy',
  mainImage: 1,
}

describe('computeStatus (Build Spec 02, Status rule)', () => {
  it('an empty work is incomplete and missing everything', () => {
    expect(computeStatus({})).toEqual({ status: 'incomplete', missing: [...REQUIRED_FIELDS] })
  })

  it('gaps make a work incomplete whether or not Live is on, and name the gaps', () => {
    expect(computeStatus({ ...complete, live: false, smell: null })).toEqual({
      status: 'incomplete',
      missing: ['smell'],
    })
    expect(computeStatus({ ...complete, live: true, smell: null, mainImage: undefined })).toEqual({
      status: 'incomplete',
      missing: ['smell', 'mainImage'],
    })
  })

  it('Live and complete is live', () => {
    expect(computeStatus({ ...complete, live: true })).toEqual({ status: 'live', missing: [] })
  })

  it('complete but not Live stays hidden', () => {
    expect(computeStatus({ ...complete, live: false })).toEqual({ status: 'hidden', missing: [] })
  })

  it('a populated main image (an object, not an id) counts as filled', () => {
    expect(computeStatus({ ...complete, live: true, mainImage: { id: 1 } }).status).toBe('live')
  })

  it('empty strings count as empty', () => {
    expect(computeStatus({ ...complete, live: true, feeling: '' }).missing).toEqual(['feeling'])
  })
})
