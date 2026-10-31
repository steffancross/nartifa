'use client'

import { toast, useDocumentInfo, useForm, useFormFields } from '@payloadcms/ui'
import { useEffect } from 'react'

import { adminText } from '@/i18n/admin-labels'
import { fileProblem } from '@/lib/images'

import { useAdminLanguage } from '../artworks/useAdminLanguage'

// Files already sent. The effect runs again while the save is under way (submit and the form state
// change, and the form can re-mount), which would otherwise save the same image twice
const saved = new WeakSet<File>()

// The file in an image form, checked in the browser before anything is sent (Build Spec 05):
// - not JPG/PNG/WebP, or over 20 MB: dropped again, with a message saying why. Without a check, a
//   file over 20 MB is cut off mid-send by the server, which the browser only reports as a network
//   error. Picked and dropped files are already stopped by src/admin/UploadGuard.tsx; this catches
//   the ones that arrive another way (pasted, or Payload's "Paste URL")
// - fine, on a new image: saved straight away, so adding an image is just choosing the file.
//   Payload then opens the saved image's page
// Renders nothing; sits in the image form as a ui field
export function FileCheck(): null {
  const language = useAdminLanguage()
  const { id } = useDocumentInfo()
  const file = useFormFields(([fields]) => fields.file?.value)
  const { dispatchFields, submit } = useForm()

  useEffect(() => {
    if (!(file instanceof File)) return
    const problem = fileProblem(file)
    if (problem) {
      toast.error(adminText(`admin.upload.${problem}`, language))
      // undefined, not null: Payload's file field only reports "A file is required" for null
      dispatchFields({ type: 'UPDATE', path: 'file', value: undefined })
    } else if (!id && !saved.has(file)) {
      saved.add(file)
      void submit()
    }
  }, [file, id, language, dispatchFields, submit])

  return null
}
