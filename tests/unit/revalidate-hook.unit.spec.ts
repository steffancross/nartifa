import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

import { revalidateTag } from 'next/cache'

import { revalidateOnChange } from '@/hooks/revalidate'

// Only the fields the hook reads; Payload passes much more
const args = (context: Record<string, unknown> = {}) =>
  ({ doc: { id: 1 }, req: { context } }) as never

describe('revalidateOnChange (Build Spec 08)', () => {
  beforeEach(() => vi.mocked(revalidateTag).mockClear())

  it('clears the tag immediately on save', () => {
    const { afterChange } = revalidateOnChange('works')
    const result = afterChange[0](args())
    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith('works', { expire: 0 })
    expect(result).toEqual({ id: 1 })
  })

  it('clears the tag immediately on delete', () => {
    const { afterDelete } = revalidateOnChange('globe')
    afterDelete[0](args())
    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith('globe', { expire: 0 })
  })

  it('does nothing when a script sets skipRevalidate', () => {
    const { afterChange, afterDelete } = revalidateOnChange('works')
    afterChange[0](args({ skipRevalidate: true }))
    afterDelete[0](args({ skipRevalidate: true }))
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})
