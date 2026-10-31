'use client'

import { useListQuery } from '@payloadcms/ui'

import { adminText } from '@/i18n/admin-labels'
import { equalsValue } from '@/lib/admin-format'

import { useAdminLanguage } from './useAdminLanguage'

const FILTERS = ['all', 'live', 'hidden', 'incomplete'] as const

// All / Live / Hidden / Incomplete above the artworks table: plain buttons instead of Payload's
// filter builder (Build Spec 07). Sets the list's where, so the URL keeps it
export function StatusFilter() {
  const language = useAdminLanguage()
  const { query, handleWhereChange } = useListQuery()
  const active = equalsValue(query.where, 'status') ?? 'all'

  return (
    <div className="nartifa-filters" role="group">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          aria-pressed={active === filter}
          className="nartifa-filter"
          onClick={() => void handleWhereChange?.(filter === 'all' ? {} : { status: { equals: filter } })}
        >
          {adminText(filter === 'all' ? 'admin.artworks.filters.all' : `admin.artworks.status.${filter}`, language)}
        </button>
      ))}
    </div>
  )
}
