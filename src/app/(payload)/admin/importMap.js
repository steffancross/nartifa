import { LiveSwitch as LiveSwitch_068f840ed7c9b179c24a60598f5693c2 } from '@/admin/artworks/LiveSwitch'
import { StatusCell as StatusCell_d78944a56005b77ec1f401925cb3c2bd } from '@/admin/artworks/StatusCell'
import { StatusNote as StatusNote_94b3cb1baa3c05796cb686b878b9aeb4 } from '@/admin/artworks/StatusNote'
import { ThumbnailCell as ThumbnailCell_ef1034a38c2b5d83e0b59b4c172f2b82 } from '@/admin/artworks/ThumbnailCell'
import { ImageField as ImageField_9b565eabbf1191766b4d495755defa1a } from '@/admin/artworks/ImageField'
import { PriceCell as PriceCell_57e7a0c5b2c4cb147b52b9d9183b22bc } from '@/admin/artworks/PriceCell'
import { TitleCell as TitleCell_3fef9465cd89d0a43e355ef937bdc2e6 } from '@/admin/artworks/TitleCell'
import { UpdatedCell as UpdatedCell_8762d5896c60404f2286c36e1b9ac8cf } from '@/admin/artworks/UpdatedCell'
import { ActionsCell as ActionsCell_325c1c48ea16b1dbd2f5199ebff9c240 } from '@/admin/artworks/ActionsCell'
import { StatusFilter as StatusFilter_25d658f0e1c8277a110441341e706047 } from '@/admin/artworks/StatusFilter'
import { DeleteButton as DeleteButton_817d6c177c726e0acef5b84f367c5872 } from '@/admin/DeleteButton'
import { FileCheck as FileCheck_38d6a66b3409289baba43e58fe9186a9 } from '@/admin/media/FileCheck'
import { UnusedFilter as UnusedFilter_d5667f4af1cc85156e24f16674086630 } from '@/admin/media/UnusedFilter'
import { UploadGuard as UploadGuard_e4d853659da21e746b50de30a292458f } from '@/admin/UploadGuard'
import { DashboardRedirect as DashboardRedirect_db00c1ab9cdfb40bf77cd7444af2e086 } from '@/admin/DashboardRedirect'
import { CollectionCards as CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1 } from '@payloadcms/next/rsc'
import { R2ClientUploadHandler as R2ClientUploadHandler_85cc02ed84006fcc91d3aff39dda669d } from '@payloadcms/storage-r2/client'

/** @type import('payload').ImportMap */
export const importMap = {
  "@/admin/artworks/LiveSwitch#LiveSwitch": LiveSwitch_068f840ed7c9b179c24a60598f5693c2,
  "@/admin/artworks/StatusCell#StatusCell": StatusCell_d78944a56005b77ec1f401925cb3c2bd,
  "@/admin/artworks/StatusNote#StatusNote": StatusNote_94b3cb1baa3c05796cb686b878b9aeb4,
  "@/admin/artworks/ThumbnailCell#ThumbnailCell": ThumbnailCell_ef1034a38c2b5d83e0b59b4c172f2b82,
  "@/admin/artworks/ImageField#ImageField": ImageField_9b565eabbf1191766b4d495755defa1a,
  "@/admin/artworks/PriceCell#PriceCell": PriceCell_57e7a0c5b2c4cb147b52b9d9183b22bc,
  "@/admin/artworks/TitleCell#TitleCell": TitleCell_3fef9465cd89d0a43e355ef937bdc2e6,
  "@/admin/artworks/UpdatedCell#UpdatedCell": UpdatedCell_8762d5896c60404f2286c36e1b9ac8cf,
  "@/admin/artworks/ActionsCell#ActionsCell": ActionsCell_325c1c48ea16b1dbd2f5199ebff9c240,
  "@/admin/artworks/StatusFilter#StatusFilter": StatusFilter_25d658f0e1c8277a110441341e706047,
  "@/admin/DeleteButton#DeleteButton": DeleteButton_817d6c177c726e0acef5b84f367c5872,
  "@/admin/media/FileCheck#FileCheck": FileCheck_38d6a66b3409289baba43e58fe9186a9,
  "@/admin/media/UnusedFilter#UnusedFilter": UnusedFilter_d5667f4af1cc85156e24f16674086630,
  "@/admin/UploadGuard#UploadGuard": UploadGuard_e4d853659da21e746b50de30a292458f,
  "@/admin/DashboardRedirect#DashboardRedirect": DashboardRedirect_db00c1ab9cdfb40bf77cd7444af2e086,
  "@payloadcms/next/rsc#CollectionCards": CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1,
  "@payloadcms/storage-r2/client#R2ClientUploadHandler": R2ClientUploadHandler_85cc02ed84006fcc91d3aff39dda669d
}
