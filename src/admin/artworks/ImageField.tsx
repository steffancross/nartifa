'use client'

import type { UploadFieldClientComponent } from 'payload'
import { Button, toast, useConfig, useField, UploadField } from '@payloadcms/ui'
import { type DragEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { UPLOAD_LIMITS } from '@/config/images'
import { adminText } from '@/i18n/admin-labels'

import { useAdminLanguage } from './useAdminLanguage'

type Id = number | string

// A work's main image and extra images (Design Spec 09): choosing or dropping a file uploads it
// and puts it in the field, with no image form in between. Payload's own field still shows the
// images and does "Choose from existing", remove and reorder; its own "Create new" and drop are
// off (allowCreate: false), since both open the image form. Our Upload button and "or drag files
// here" go inside Payload's box, where its own ones were (portals into its markup, found by class
// name). The box is hidden while a main image is chosen: remove it to pick another, as in Payload.
// Bad files are stopped before this sees them (src/admin/UploadGuard.tsx); the server's message
// (e.g. too large to process) shows as a toast
export const ImageField: UploadFieldClientComponent = (props) => {
  const { path, field, readOnly } = props
  const hasMany = Boolean(field.hasMany)
  const language = useAdminLanguage()
  const text = (key: string, vars?: Record<string, string>) => adminText(`admin.upload.${key}`, language, vars)
  const { config } = useConfig()
  const { value, setValue } = useField<Id | Id[] | null>({ path })
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ buttons: Element; content: Element } | null>(null)

  // Payload's box comes and goes with the field's value, so look for it whenever its markup changes
  useEffect(() => {
    const root = wrapper.current
    if (!root) return
    const find = () => {
      const buttons = root.querySelector('.upload__dropzoneContent__buttons')
      const content = root.querySelector('.upload__dropzoneContent')
      setBox((previous) =>
        buttons && content
          ? previous?.buttons === buttons && previous.content === content
            ? previous
            : { buttons, content }
          : null,
      )
    }
    find()
    const observer = new MutationObserver(find)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  // The latest value, so files finishing one after another all land in the list
  const current = useRef(value)
  useEffect(() => {
    current.current = value
  }, [value])

  const upload = async (file: File): Promise<Id> => {
    const body = new FormData()
    body.append('file', file)
    body.append('_payload', '{}')
    const response = await fetch(`${config.serverURL}${config.routes.api}/${field.relationTo}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Accept-Language': language },
      body,
    })
    const json = (await response.json().catch((): null => null)) as {
      doc?: { id: Id }
      errors?: { message?: string }[]
    } | null
    if (!response.ok || !json?.doc?.id) throw new Error(json?.errors?.[0]?.message || text('failed'))
    return json.doc.id
  }

  const uploadAll = async (files: File[]) => {
    const chosen = hasMany ? files : files.slice(0, 1)
    if (chosen.length === 0 || progress) return
    setProgress({ done: 0, total: chosen.length })
    for (const [index, file] of chosen.entries()) {
      try {
        const id = await upload(file)
        if (hasMany) {
          const ids = (Array.isArray(current.current) ? current.current : []).map((item) =>
            typeof item === 'object' && item ? ((item as { value?: Id; id?: Id }).value ?? (item as { id: Id }).id) : item,
          )
          setValue([...ids, id])
          current.current = [...ids, id]
        } else {
          setValue(id)
        }
      } catch (error) {
        toast.error(`${file.name}: ${(error as Error).message}`)
      }
      setProgress({ done: index + 1, total: chosen.length })
    }
    setProgress(null)
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    if (!readOnly) void uploadAll(Array.from(event.dataTransfer.files))
  }

  const label = progress
    ? text('uploading', { done: String(progress.done + 1), total: String(progress.total) })
    : text(hasMany ? 'chooseMany' : 'chooseOne')

  return (
    <div
      ref={wrapper}
      className={['nartifa-image-field', dragging ? 'nartifa-image-field--dragging' : ''].filter(Boolean).join(' ')}
      onDragOver={(event) => {
        event.preventDefault()
        if (!readOnly) setDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <UploadField {...props} />
      <input
        ref={input}
        type="file"
        hidden
        multiple={hasMany}
        accept={UPLOAD_LIMITS.mimeTypes.join(',')}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          void uploadAll(files)
        }}
      />
      {box && !readOnly
        ? createPortal(
            // First in Payload's row of buttons: Upload image or Choose from existing
            <span className="nartifa-image-field__upload">
              <Button buttonStyle="pill" size="small" disabled={Boolean(progress)} onClick={() => input.current?.click()}>
                {label}
              </Button>
              <span className="upload__dropzoneContent__orText">{text('or')}</span>
            </span>,
            box.buttons,
          )
        : null}
      {box && !readOnly ? createPortal(<p className="upload__dragAndDropText">{text('orDrop')}</p>, box.content) : null}
    </div>
  )
}
