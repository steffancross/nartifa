'use client'

import type { DefaultCellComponentProps } from 'payload'
import Link from 'next/link'

import { imageUrl } from '@/lib/images'

import { useEditURL } from './editURL'

// Main image as a 40×40 square (the 200px thumb size), linking to the work. The list loads works
// at depth 0, so cellData is the image id. The work's updatedAt stands in for the image's in ?v=
export function ThumbnailCell({ cellData, rowData, collectionSlug }: DefaultCellComponentProps) {
  const href = useEditURL(collectionSlug, rowData.id as number)
  const id = typeof cellData === 'object' && cellData ? (cellData as { id: number }).id : Number(cellData)

  return (
    <Link href={href} className="nartifa-thumb" aria-hidden tabIndex={-1}>
      {id ? (
        // eslint-disable-next-line @next/next/no-img-element -- already sized by /img
        <img src={imageUrl('media', { id, updatedAt: rowData.updatedAt as string }, 'thumb')} alt="" width={40} height={40} />
      ) : null}
    </Link>
  )
}
