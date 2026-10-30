import type { CollectionConfig, Field } from 'payload'

import { FEELINGS, SENSE_OPTIONS, SENSES } from '@/config/quiz'
import { revalidateOnChange } from '@/hooks/revalidate'
import { adminLabel } from '@/i18n/admin-labels'
import { CACHE_TAGS } from '@/lib/cache-tags'

// Fields as in Build Spec 02. The id is the URL slug (/works/12): AUTOINCREMENT in the adapter means
// it is never reused. status, missing and searchText are filled by hooks (next chunk); the form
// layout (sidebar, sections) comes with the admin UI chunk

const senseFields: Field[] = SENSES.map((sense) => ({
  name: sense,
  type: 'select',
  label: adminLabel(`quiz.senses.${sense}`),
  options: SENSE_OPTIONS.map((option) => ({
    value: option,
    label: adminLabel(`quiz.${sense}.${option}`),
  })),
}))

export const Artworks: CollectionConfig = {
  slug: 'artworks',
  labels: {
    singular: { en: 'Artwork', ja: '作品' },
    plural: { en: 'Artworks', ja: '作品' },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'price', 'updatedAt'],
  },
  hooks: revalidateOnChange(CACHE_TAGS.works),
  fields: [
    {
      name: 'live',
      type: 'checkbox',
      label: { en: 'Live', ja: '公開' },
      defaultValue: false,
    },
    {
      name: 'status',
      type: 'select',
      label: { en: 'Status', ja: '状態' },
      defaultValue: 'hidden',
      options: [
        { value: 'live', label: { en: 'Live', ja: '公開中' } },
        { value: 'hidden', label: { en: 'Hidden', ja: '非公開' } },
        { value: 'incomplete', label: { en: 'Incomplete', ja: '未完成' } },
      ],
      admin: { readOnly: true },
    },
    {
      // Names of the required fields that are empty, e.g. ["smell", "mainImage"]
      name: 'missing',
      type: 'text',
      hasMany: true,
      label: { en: 'Missing', ja: '未入力' },
      admin: { readOnly: true },
    },
    ...senseFields,
    {
      name: 'feeling',
      type: 'select',
      label: adminLabel('quiz.senses.feeling'),
      options: FEELINGS.map((feeling) => ({
        value: feeling,
        label: adminLabel(`quiz.feeling.${feeling}`),
      })),
    },
    {
      name: 'mainImage',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Main image', ja: 'メイン画像' },
    },
    {
      name: 'extraImages',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      label: { en: 'Extra images', ja: '追加画像' },
    },
    {
      name: 'title',
      type: 'text',
      localized: true,
      label: { en: 'Title', ja: 'タイトル' },
    },
    {
      // Plain text; blank lines = paragraphs (Build Spec 02, Proposed)
      name: 'description',
      type: 'textarea',
      localized: true,
      label: { en: 'Description', ja: '説明' },
    },
    {
      // Whole yen. Empty = "Price on request"
      name: 'price',
      type: 'number',
      min: 0,
      label: { en: 'Price (JPY)', ja: '価格（円）' },
      admin: { step: 1 },
    },
    {
      // One shared value, not localized
      name: 'size',
      type: 'text',
      label: { en: 'Size', ja: 'サイズ' },
    },
    {
      name: 'materials',
      type: 'text',
      localized: true,
      label: { en: 'Materials', ja: '素材' },
    },
    {
      name: 'medium',
      type: 'text',
      localized: true,
      label: { en: 'Medium', ja: '技法' },
    },
    {
      name: 'year',
      type: 'number',
      label: { en: 'Year', ja: '制作年' },
    },
    {
      // Slug "series": "collections" is Payload's own word. Shown as "Collections" (Build Spec 02)
      name: 'series',
      type: 'relationship',
      relationTo: 'series',
      hasMany: true,
      label: { en: 'Collections', ja: 'コレクション' },
    },
    {
      // Both titles, lower-cased, so the admin search finds either language (Build Spec 07)
      name: 'searchText',
      type: 'text',
      admin: { hidden: true, readOnly: true },
    },
  ],
}
