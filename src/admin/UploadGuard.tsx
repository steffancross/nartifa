'use client'

import { toast, useTranslation } from '@payloadcms/ui'
import { type ReactNode, useEffect, useRef } from 'react'

import { adminText } from '@/i18n/admin-labels'
import { fileProblem } from '@/lib/images'

// Stops a file that can't be uploaded (not JPG/PNG/WebP, or over 20 MB) at the moment it's picked
// or dropped, anywhere in the admin, before Payload sees it (Build Spec 05). Listens on window in
// the capture phase, so it runs before Payload's own handlers:
// - picked: the bad files are taken out of the input; if none are left, Payload never hears of it
// - dropped: a drop can't be edited, so a drop with any bad file is refused whole
// Needed for the extra-images upload (Payload's bulk upload), which keeps its own copy of each file
// where the form-level check (src/admin/media/FileCheck.tsx) can't reach it
export function UploadGuard({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  // The current admin language for the listeners below, which are set up once
  const language = useRef(i18n.language)
  useEffect(() => {
    language.current = i18n.language
  }, [i18n.language])

  useEffect(() => {
    const warn = (files: File[]) => {
      const problems = new Set(files.map((file) => fileProblem(file)).filter((problem) => problem !== null))
      for (const problem of problems) toast.error(adminText(`admin.upload.${problem}`, language.current))
    }

    const onChange = (event: Event) => {
      const input = event.target
      if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.files?.length) return
      const files = Array.from(input.files)
      const good = files.filter((file) => !fileProblem(file))
      if (good.length === files.length) return
      warn(files)
      if (good.length === 0) {
        event.stopImmediatePropagation()
        input.value = ''
        return
      }
      const kept = new DataTransfer()
      for (const file of good) kept.items.add(file)
      input.files = kept.files
    }

    const onDrop = (event: DragEvent) => {
      const files = Array.from(event.dataTransfer?.files ?? [])
      if (!files.some((file) => fileProblem(file))) return
      event.preventDefault()
      event.stopImmediatePropagation()
      warn(files)
      // Payload's drop zone would otherwise stay highlighted, waiting for its own drop
      ;(event.target as Element | null)?.closest?.('.dropzone')?.dispatchEvent(new Event('dragleave'))
    }

    window.addEventListener('change', onChange, true)
    window.addEventListener('drop', onDrop, true)
    return () => {
      window.removeEventListener('change', onChange, true)
      window.removeEventListener('drop', onDrop, true)
    }
  }, [])

  return children
}
