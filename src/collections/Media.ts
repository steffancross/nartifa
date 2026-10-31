import type { CollectionConfig } from 'payload'

import { ADMIN_GROUP, ITEM_PAGE_COMPONENTS } from '@/config/admin'
import { UPLOAD_LIMITS } from '@/config/images'
import { imageSizeHooks } from '@/hooks/image-sizes'
import { checkUploadedFile, clearMainImage, findWorksUsingImage } from '@/hooks/media'
import { revalidateOnChange } from '@/hooks/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { imageUrl } from '@/lib/images'

// Artwork images (Build Spec 02, 05). Originals live in R2 under media/ (prefix set in
// payload.config.ts) and are never public: the site serves only the named sizes through /img.
// No alt field: alt text is generated from the artwork title
const revalidate = revalidateOnChange(CACHE_TAGS.works)
const sizes = imageSizeHooks('media')

// Shown once the image exists: a new image's page is only the file picker, and saves itself as
// soon as a file is chosen (src/admin/media/FileCheck.tsx)
const onceSaved = (data: { id?: unknown } | undefined) => Boolean(data?.id)

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { en: 'Image', ja: '画像' },
    plural: { en: 'Images', ja: '画像' },
  },
  admin: {
    // Kept in the menu (decided 2026-10-30): the one place to delete images no work uses
    group: ADMIN_GROUP,
    defaultColumns: ['filename', 'inUse', 'updatedAt'],
    hideAPIURL: true,
    components: {
      ...ITEM_PAGE_COMPONENTS,
      beforeListTable: ['@/admin/media/UnusedFilter#UnusedFilter'],
    },
  },
  access: {
    // Logged-in admins only, so /api/media/file/... can't hand out full-resolution originals.
    // Public pages read media through Payload's local API, which skips access rules
    read: ({ req }) => Boolean(req.user),
  },
  // An item's page is just its form (src/config/admin.ts)
  disableDuplicate: true,
  hooks: {
    // Not JPG/PNG/WebP, or over 20 MB: refused with a clear message (src/hooks/media.ts)
    beforeOperation: [checkUploadedFile],
    // Named sizes made at upload, written to derived/ once saved (src/hooks/image-sizes.ts)
    beforeChange: [sizes.beforeChange],
    afterChange: [sizes.afterChange, ...revalidate.afterChange],
    // A work whose main image is deleted comes off the site (src/hooks/media.ts)
    beforeDelete: [findWorksUsingImage],
    afterDelete: [...revalidate.afterDelete, clearMainImage, sizes.afterDelete],
  },
  fields: [
    {
      // Checks a chosen file in the browser before it's sent (src/admin/media/FileCheck.tsx). No data
      name: 'fileCheck',
      type: 'ui',
      admin: { disableListColumn: true, components: { Field: '@/admin/media/FileCheck#FileCheck' } },
    },
    {
      // Used by any work? Kept up to date by the artwork hooks (src/hooks/image-usage.ts); behind
      // the Unused filter on the Images list
      name: 'inUse',
      type: 'checkbox',
      defaultValue: false,
      label: { en: 'In use', ja: '使用中' },
      admin: { readOnly: true, position: 'sidebar', condition: onceSaved },
    },
    // Which works use this image. Virtual (nothing stored): read from artworks. Shown on the
    // image's page
    {
      name: 'usedAsMain',
      type: 'join',
      collection: 'artworks',
      on: 'mainImage',
      label: { en: 'Main image of', ja: 'メイン画像として使用' },
      admin: { allowCreate: false, defaultColumns: ['displayTitle', 'status'], condition: onceSaved },
    },
    {
      name: 'usedAsExtra',
      type: 'join',
      collection: 'artworks',
      on: 'extraImages',
      label: { en: 'Extra image of', ja: '追加画像として使用' },
      admin: { allowCreate: false, defaultColumns: ['displayTitle', 'status'], condition: onceSaved },
    },
  ],
  upload: {
    mimeTypes: UPLOAD_LIMITS.mimeTypes,
    // One image at a time, always (decided 2026-10-30): no Bulk upload on the Images list
    bulkUpload: false,
    // Not supported on Workers (no sharp); sizes come from the Images binding instead (Build Spec 05)
    crop: false,
    focalPoint: false,
    // The whole image within 400×400 through /img, so admin previews are never cropped and never
    // load the full-size original (custom.scss shows it uncropped too)
    adminThumbnail: ({ doc }) => imageUrl('media', doc as { id: number; updatedAt?: string }, 'preview'),
  },
}
