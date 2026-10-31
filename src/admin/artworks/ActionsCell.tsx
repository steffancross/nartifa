'use client'

import type { DefaultCellComponentProps } from 'payload'
import { ConfirmationModal, Popup, PopupList, toast, useConfig, useModal } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { adminText } from '@/i18n/admin-labels'

import { useAdminLanguage } from './useAdminLanguage'
import { useEditURL } from './editURL'

// The ⋯ menu on each row: Edit · Hide/Show · Delete (Design Spec 09). Hide/Show flips Live; the
// status then follows from the hook. Show is greyed out on an incomplete work, which can't go live. Both go through the REST API, then the table reloads
export function ActionsCell({ rowData, collectionSlug }: DefaultCellComponentProps) {
  const language = useAdminLanguage()
  const text = (key: string, vars?: Record<string, string>) => adminText(`admin.${key}`, language, vars)
  const { config } = useConfig()
  const router = useRouter()
  const { openModal } = useModal()
  const [busy, setBusy] = useState(false)

  const id = rowData.id as number
  const editURL = useEditURL(collectionSlug, id)
  const apiURL = `${config.serverURL}${config.routes.api}/${collectionSlug}/${id}`
  const modalSlug = `delete-${collectionSlug}-${id}`
  const title = (rowData.displayTitle as string) || text('artworks.untitled')
  const live = Boolean(rowData.live)
  const incomplete = rowData.status === 'incomplete'

  const send = async (init: RequestInit) => {
    setBusy(true)
    try {
      const response = await fetch(apiURL, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': language },
        ...init,
      })
      if (!response.ok) throw new Error(String(response.status))
      router.refresh()
    } catch {
      toast.error(text('artworks.actions.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Popup
        button={<span aria-label={text('artworks.actions.menu')}>⋯</span>}
        buttonType="custom"
        buttonClassName="nartifa-actions"
        disabled={busy}
        horizontalAlign="right"
        size="small"
        render={({ close }) => (
          <PopupList.ButtonGroup>
            <PopupList.Button href={editURL}>{text('artworks.actions.edit')}</PopupList.Button>
            <PopupList.Button
              disabled={incomplete}
              onClick={() => {
                close()
                void send({ method: 'PATCH', body: JSON.stringify({ live: !live }) })
              }}
            >
              {text(live ? 'artworks.actions.hide' : 'artworks.actions.show')}
            </PopupList.Button>
            <PopupList.Button
              className="nartifa-danger"
              onClick={() => {
                close()
                openModal(modalSlug)
              }}
            >
              {text('artworks.actions.delete')}
            </PopupList.Button>
          </PopupList.ButtonGroup>
        )}
      />
      <ConfirmationModal
        modalSlug={modalSlug}
        heading={text('artworks.actions.delete')}
        body={text('delete.confirmOne', { title })}
        confirmLabel={text('artworks.actions.delete')}
        onConfirm={() => send({ method: 'DELETE' })}
      />
    </>
  )
}
