'use client'

import { useFormFields } from '@payloadcms/ui'

import { REQUIRED_FIELDS } from '@/config/artworks'
import { adminText } from '@/i18n/admin-labels'
import { missingFieldNames } from '@/lib/admin-format'
import { computeStatus } from '@/lib/artwork-status'

import { useAdminLanguage } from './useAdminLanguage'

// The status field in the form's sidebar, shown under the Live switch as a note worked out from
// what's in the form right now, with the same rule as the save (computeStatus): "Can't be shown
// yet. Needs: Smell, Main image"
export function StatusNote() {
  const language = useAdminLanguage()
  const values = useFormFields(([fields]) =>
    Object.fromEntries(['live', ...REQUIRED_FIELDS].map((name) => [name, fields[name]?.value])),
  )
  const { status, missing } = computeStatus(values)

  return (
    <p className={`nartifa-note nartifa-status--${status}`} data-testid="status-note">
      {adminText(`admin.artworks.note.${status}`, language, { fields: missingFieldNames(missing, language) })}
    </p>
  )
}
