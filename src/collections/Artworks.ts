import type { CollectionConfig, Field } from 'payload'

import { ADMIN_GROUP, ITEM_PAGE_COMPONENTS } from '@/config/admin'
import { FEELINGS, SENSE_OPTIONS, SENSES } from '@/config/quiz'
import { setStatus, setTitles } from '@/hooks/artworks'
import { refreshUsageAfterDelete, refreshUsageAfterSave } from '@/hooks/image-usage'
import { revalidateOnChange } from '@/hooks/revalidate'
import { adminLabel } from '@/i18n/admin-labels'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { validateWholeYen, validateYear } from '@/lib/validation'

// Fields as in Build Spec 02. The id is the URL slug (/works/12): AUTOINCREMENT in the adapter means
// it is never reused. Text that exists in both languages is a plain JA/EN pair of fields, not a
// Payload localized field, so the form shows both side by side (Build Spec 02, 07). status, missing,
// displayTitle and searchText are filled by hooks (src/hooks/artworks.ts).
// Collapsibles and rows are layout only: they don't change the stored data

const senseFields: Field[] = SENSES.map((sense) => ({
  name: sense,
  type: 'select',
  label: adminLabel(`quiz.senses.${sense}`),
  options: SENSE_OPTIONS.map((option) => ({
    value: option,
    label: adminLabel(`quiz.${sense}.${option}`),
  })),
  admin: { width: '33%' },
}))

// A Japanese/English pair in one row, Japanese first
const revalidate = revalidateOnChange(CACHE_TAGS.works)

const pair = (
  name: string,
  label: { en: string; ja: string },
  type: 'text' | 'textarea' = 'text',
): Field => {
  const half = (lang: 'Ja' | 'En', en: string, ja: string): Field => {
    const common = { name: `${name}${lang}`, label: { en, ja }, admin: { width: '50%' } }
    return type === 'textarea' ? { ...common, type: 'textarea' } : { ...common, type: 'text' }
  }
  return {
    type: 'row',
    fields: [
      half('Ja', `${label.en} (Japanese)`, `${label.ja}（日本語）`),
      half('En', `${label.en} (English)`, `${label.ja}（英語）`),
    ],
  }
}

export const Artworks: CollectionConfig = {
  slug: 'artworks',
  labels: {
    singular: { en: 'Artwork', ja: '作品' },
    plural: { en: 'Artworks', ja: '作品' },
  },
  admin: {
    useAsTitle: 'displayTitle',
    // In the admin menu under one heading, not Payload's default "Collections" (which reads as the
    // artist's collections)
    group: ADMIN_GROUP,
    defaultColumns: ['mainImage', 'displayTitle', 'price', 'status', 'updatedAt', 'actions'],
    // The list search box looks in both titles
    listSearchableFields: ['searchText'],
    hideAPIURL: true,
    components: {
      ...ITEM_PAGE_COMPONENTS,
      beforeListTable: ['@/admin/artworks/StatusFilter#StatusFilter'],
    },
  },
  // Admin table: most recently changed first
  defaultSort: '-updatedAt',
  // An item's page is just its form (src/config/admin.ts)
  disableDuplicate: true,
  hooks: {
    beforeChange: [setStatus, setTitles],
    // Keep each image's "In use" right, for the Unused filter on Images (src/hooks/image-usage.ts)
    afterChange: [refreshUsageAfterSave, ...revalidate.afterChange],
    afterDelete: [refreshUsageAfterDelete, ...revalidate.afterDelete],
  },
  fields: [
    // Sidebar: what the artist wants, what she gets, and collections
    {
      // The artist's switch. Can only be on when nothing required is missing (setStatus)
      name: 'live',
      type: 'checkbox',
      label: adminLabel('admin.artworks.live'),
      defaultValue: false,
      admin: { position: 'sidebar', components: { Field: '@/admin/artworks/LiveSwitch#LiveSwitch' } },
    },
    {
      name: 'status',
      type: 'select',
      label: { en: 'Status', ja: '状態' },
      defaultValue: 'hidden',
      options: [
        { value: 'live', label: adminLabel('admin.artworks.status.live') },
        { value: 'hidden', label: adminLabel('admin.artworks.status.hidden') },
        { value: 'incomplete', label: adminLabel('admin.artworks.status.incomplete') },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
        components: {
          // In the form: a note under the Live switch, worked out live from the form, not the
          // last saved value
          Field: '@/admin/artworks/StatusNote#StatusNote',
          Cell: '@/admin/artworks/StatusCell#StatusCell',
        },
      },
    },
    {
      // Names of the required fields that are empty, e.g. ["smell", "mainImage"]. Shown through
      // the status note
      name: 'missing',
      type: 'text',
      hasMany: true,
      label: { en: 'Missing', ja: '未入力' },
      admin: { readOnly: true, hidden: true },
    },
    {
      // Slug "series": "collections" is Payload's own word. Shown as "Collections" (Build Spec 02)
      name: 'series',
      type: 'relationship',
      relationTo: 'series',
      hasMany: true,
      label: { en: 'Collections', ja: 'コレクション' },
      admin: { position: 'sidebar' },
    },
    {
      type: 'collapsible',
      label: { en: 'Images', ja: '画像' },
      fields: [
        {
          name: 'mainImage',
          type: 'upload',
          relationTo: 'media',
          label: adminLabel('admin.artworks.mainImage'),
          admin: {
            // Choosing a file uploads it straight into the field (src/admin/artworks/ImageField.tsx);
            // Payload's own "Create new" would open the image form first
            allowCreate: false,
            components: {
              Field: '@/admin/artworks/ImageField#ImageField',
              Cell: '@/admin/artworks/ThumbnailCell#ThumbnailCell',
            },
          },
        },
        {
          name: 'extraImages',
          type: 'upload',
          relationTo: 'media',
          hasMany: true,
          label: { en: 'Extra images', ja: '追加画像' },
          admin: { allowCreate: false, components: { Field: '@/admin/artworks/ImageField#ImageField' } },
        },
      ],
    },
    {
      type: 'collapsible',
      label: { en: 'Matching', ja: 'マッチング' },
      fields: [
        { type: 'row', fields: senseFields.slice(0, 3) },
        {
          type: 'row',
          fields: [
            ...senseFields.slice(3),
            {
              name: 'feeling',
              type: 'select',
              label: adminLabel('quiz.senses.feeling'),
              options: FEELINGS.map((feeling) => ({
                value: feeling,
                label: adminLabel(`quiz.feeling.${feeling}`),
              })),
              admin: { width: '33%' },
            },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: { en: 'Content', ja: '内容' },
      fields: [
        pair('title', { en: 'Title', ja: 'タイトル' }),
        // Plain text; blank lines = paragraphs (Build Spec 02, Proposed)
        pair('description', { en: 'Description', ja: '説明' }, 'textarea'),
        {
          type: 'row',
          fields: [
            {
              // Whole yen. Empty = "Price on request"
              name: 'price',
              type: 'number',
              label: { en: 'Price (JPY)', ja: '価格（円）' },
              validate: validateWholeYen,
              admin: {
                step: 1,
                width: '33%',
                components: { Cell: '@/admin/artworks/PriceCell#PriceCell' },
              },
            },
            {
              // One shared value, not per language
              name: 'size',
              type: 'text',
              label: { en: 'Size', ja: 'サイズ' },
              admin: { width: '33%' },
            },
            {
              name: 'year',
              type: 'number',
              label: { en: 'Year', ja: '制作年' },
              validate: validateYear,
              admin: { width: '33%' },
            },
          ],
        },
        pair('materials', { en: 'Materials', ja: '素材' }),
        pair('medium', { en: 'Medium', ja: '技法' }),
      ],
    },
    {
      // Japanese title, else English: the work's name everywhere in the admin (table, form
      // header, pickers), since either title may be the only one
      name: 'displayTitle',
      type: 'text',
      label: { en: 'Title', ja: 'タイトル' },
      admin: { hidden: true, readOnly: true, components: { Cell: '@/admin/artworks/TitleCell#TitleCell' } },
    },
    {
      // Both titles, lower-cased, so the admin search finds either language (Build Spec 07)
      name: 'searchText',
      type: 'text',
      admin: { hidden: true, readOnly: true },
    },
    {
      // Payload's own updatedAt, declared here only to show it as "3 days ago" in the table
      name: 'updatedAt',
      type: 'date',
      index: true,
      label: ({ t }) => t('general:updatedAt'),
      admin: {
        hidden: true,
        disableBulkEdit: true,
        components: { Cell: '@/admin/artworks/UpdatedCell#UpdatedCell' },
      },
    },
    {
      // The ⋯ menu column in the table (Edit · Hide/Show · Delete). No data
      name: 'actions',
      type: 'ui',
      label: '',
      admin: {
        components: { Cell: '@/admin/artworks/ActionsCell#ActionsCell' },
      },
    },
  ],
}
