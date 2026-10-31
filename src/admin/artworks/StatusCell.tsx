'use client'

import type { DefaultCellComponentProps } from 'payload'

import { adminText } from '@/i18n/admin-labels'

import { useAdminLanguage } from './useAdminLanguage'

// Live / Hidden / Incomplete in the status colors (Design Spec 09). What's missing shows only on
// the work's own page
export function StatusCell({ cellData }: DefaultCellComponentProps) {
  const language = useAdminLanguage()
  const status = (cellData as string) || 'hidden'

  return (
    <span className={`nartifa-status nartifa-status--${status}`}>
      {adminText(`admin.artworks.status.${status}`, language)}
    </span>
  )
}
