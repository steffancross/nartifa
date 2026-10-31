'use client'

import { useConfig } from '@payloadcms/ui'

// /admin/collections/artworks/12
export function useEditURL(collection: string, id: number | string): string {
  return `${useConfig().config.routes.admin}/collections/${collection}/${id}`
}
