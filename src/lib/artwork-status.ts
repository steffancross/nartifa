import { REQUIRED_FIELDS, type RequiredField } from '@/config/artworks'

export type ArtworkStatus = 'live' | 'hidden' | 'incomplete'

const isEmpty = (value: unknown) =>
  value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)

// The status rule (Build Spec 02): the artist's Live switch, held back while anything required is empty
export function computeStatus(work: { live?: boolean | null } & Partial<Record<RequiredField, unknown>>): {
  status: ArtworkStatus
  missing: RequiredField[]
} {
  const missing = REQUIRED_FIELDS.filter((field) => isEmpty(work[field]))
  if (!work.live) return { status: 'hidden', missing }
  return { status: missing.length > 0 ? 'incomplete' : 'live', missing }
}
