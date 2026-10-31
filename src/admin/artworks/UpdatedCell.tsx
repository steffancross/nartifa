'use client'

import type { DefaultCellComponentProps } from 'payload'

import { relativeTime } from '@/lib/admin-format'

import { useAdminLanguage } from './useAdminLanguage'

// "3 days ago", with the exact time on hover
export function UpdatedCell({ cellData }: DefaultCellComponentProps) {
  const language = useAdminLanguage()
  if (!cellData) return null
  const date = new Date(cellData as string)
  return (
    <time dateTime={date.toISOString()} title={date.toLocaleString(language)}>
      {relativeTime(date, language)}
    </time>
  )
}
