'use client'

import type { DefaultCellComponentProps } from 'payload'

import { formatPrice } from '@/lib/admin-format'

import { useAdminLanguage } from './useAdminLanguage'

export function PriceCell({ cellData }: DefaultCellComponentProps) {
  const language = useAdminLanguage()
  const price = typeof cellData === 'number' ? cellData : null
  return <span className={price === null ? 'nartifa-muted' : undefined}>{formatPrice(price, language)}</span>
}
