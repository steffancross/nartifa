'use client'

import { useListQuery } from '@payloadcms/ui'

import { adminText } from '@/i18n/admin-labels'
import { equalsValue } from '@/lib/admin-format'

import { useAdminLanguage } from '../artworks/useAdminLanguage'

// All images / Unused above the Images list: Unused = not the main or an extra image of any work
// (media.inUse, kept up to date by src/hooks/image-usage.ts). Safe to delete

// 'false' as text: Payload drops a boolean false when it writes the filter into the URL; the server
// reads the text back as a checkbox value
const UNUSED = { inUse: { equals: 'false' } }

export function UnusedFilter() {
  const language = useAdminLanguage()
  const { query, handleWhereChange } = useListQuery()
  const unused = equalsValue(query.where, 'inUse') === 'false'

  return (
    <div className="nartifa-filters" role="group">
      {(['all', 'unused'] as const).map((filter) => (
        <button
          key={filter}
          type="button"
          aria-pressed={unused === (filter === 'unused')}
          className="nartifa-filter"
          onClick={() => void handleWhereChange?.(filter === 'unused' ? UNUSED : {})}
        >
          {adminText(`admin.media.filters.${filter}`, language)}
        </button>
      ))}
    </div>
  )
}
