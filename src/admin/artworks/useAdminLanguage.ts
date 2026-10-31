'use client'

import { useTranslation } from '@payloadcms/ui'

import { adminLanguage, type AdminLanguage } from '@/i18n/admin-labels'

// The admin's interface language (set per account), for our own admin text
export function useAdminLanguage(): AdminLanguage {
  return adminLanguage(useTranslation().i18n.language)
}
