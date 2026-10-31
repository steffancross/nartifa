'use client'

import { Button, ConfirmationModal, toast, useConfig, useDocumentInfo, useDocumentTitle, useModal } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { adminText } from '@/i18n/admin-labels'

import { useAdminLanguage } from './artworks/useAdminLanguage'

// Delete, next to Save on an item's page (Build Spec 07). Stands in for Payload's ⋮ menu, which is
// hidden (custom.scss): it also offered Create new and Duplicate, which nobody needs here. Asks
// first, with the same "can't be recovered" text as the table, then goes back to the list
export function DeleteButton() {
  const language = useAdminLanguage()
  const text = (key: string, vars?: Record<string, string>) => adminText(`admin.${key}`, language, vars)
  const { config } = useConfig()
  const { id, collectionSlug } = useDocumentInfo()
  const { title } = useDocumentTitle()
  const { openModal } = useModal()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (!id || !collectionSlug) return null
  const modalSlug = `delete-document-${collectionSlug}-${id}`

  const remove = async () => {
    setBusy(true)
    try {
      const response = await fetch(`${config.serverURL}${config.routes.api}/${collectionSlug}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Accept-Language': language },
      })
      if (!response.ok) throw new Error(String(response.status))
      router.push(`${config.routes.admin}/collections/${collectionSlug}`)
    } catch {
      toast.error(text('artworks.actions.failed'))
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        buttonStyle="secondary"
        size="medium"
        className="nartifa-delete"
        disabled={busy}
        onClick={() => openModal(modalSlug)}
      >
        {text('artworks.actions.delete')}
      </Button>
      <ConfirmationModal
        modalSlug={modalSlug}
        heading={text('artworks.actions.delete')}
        body={text('delete.confirmOne', { title: title || text('artworks.untitled') })}
        confirmLabel={text('artworks.actions.delete')}
        onConfirm={remove}
      />
    </>
  )
}
