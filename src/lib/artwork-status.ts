import { REQUIRED_FIELDS, type RequiredField } from '@/config/artworks'

export type ArtworkStatus = 'live' | 'hidden' | 'incomplete'

const isEmpty = (value: unknown) =>
  value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)

// The status rule (Build Spec 02): anything required empty → incomplete, and Live can't be on.
// Otherwise the artist's Live switch decides between live and hidden
export function computeStatus(work: { live?: boolean | null } & Partial<Record<RequiredField, unknown>>): {
  status: ArtworkStatus
  missing: RequiredField[]
} {
  const missing = REQUIRED_FIELDS.filter((field) => isEmpty(work[field]))
  if (missing.length > 0) return { status: 'incomplete', missing }
  return { status: work.live ? 'live' : 'hidden', missing }
}
