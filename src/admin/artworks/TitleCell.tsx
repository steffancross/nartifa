'use client'

import type { DefaultCellComponentProps } from 'payload'
import Link from 'next/link'

import { adminText } from '@/i18n/admin-labels'

import { useAdminLanguage } from './useAdminLanguage'
import { useEditURL } from './editURL'

// displayTitle (Japanese, else English) linking to the edit form; "Untitled" when neither exists
export function TitleCell({ cellData, rowData, collectionSlug }: DefaultCellComponentProps) {
  const language = useAdminLanguage()
  const href = useEditURL(collectionSlug, rowData.id as number)
  const title = typeof cellData === 'string' && cellData ? cellData : null

  return (
    <Link href={href} className={title ? undefined : 'nartifa-muted'}>
      {title ?? adminText('admin.artworks.untitled', language)}
    </Link>
  )
}
