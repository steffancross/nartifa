import type { AdminViewServerProps } from 'payload'
import { redirect } from 'next/navigation'

// /admin opens on the artworks table instead of Payload's dashboard (Build Spec 07)
export function DashboardRedirect({ initPageResult }: AdminViewServerProps) {
  redirect(`${initPageResult.req.payload.config.routes.admin}/collections/artworks`)
}
