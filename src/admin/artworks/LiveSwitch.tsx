'use client'

import type { CheckboxFieldClientComponent } from 'payload'
import { useField, useFormFields } from '@payloadcms/ui'
import { useEffect } from 'react'

import { REQUIRED_FIELDS } from '@/config/artworks'
import { adminText } from '@/i18n/admin-labels'
import { computeStatus } from '@/lib/artwork-status'

import { useAdminLanguage } from './useAdminLanguage'

// The Live field in the form's sidebar as a switch, "Show on the site" (Design Spec 09). Greyed out
// while anything required is empty, and turned off if a field is emptied on a live work: the save
// would turn it off anyway (setStatus). The status note under it says what's needed
export const LiveSwitch: CheckboxFieldClientComponent = ({ path, readOnly }) => {
  const language = useAdminLanguage()
  const { value, setValue } = useField<boolean>({ path })
  // Joined to a string so the selector returns the same value while nothing relevant changes
  const missing = useFormFields(([fields]) =>
    computeStatus(Object.fromEntries(REQUIRED_FIELDS.map((name) => [name, fields[name]?.value]))).missing.join(),
  )
  const blocked = missing.length > 0
  const on = Boolean(value) && !blocked

  useEffect(() => {
    if (blocked && value) setValue(false)
  }, [blocked, value, setValue])

  return (
    <div className="field-type nartifa-live">
      <button
        type="button"
        role="switch"
        id={`field-${path}`}
        aria-checked={on}
        disabled={blocked || readOnly}
        className="nartifa-switch"
        onClick={() => setValue(!on)}
      >
        <span className="nartifa-switch__track" aria-hidden>
          <span className="nartifa-switch__thumb" />
        </span>
        {adminText('admin.artworks.live', language)}
      </button>
    </div>
  )
}
