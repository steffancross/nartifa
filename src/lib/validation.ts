import type { NumberFieldSingleValidation } from 'payload'

import { adminLabel } from '@/i18n/admin-labels'

// Field checks for the artwork form (Design Spec 09, Validation), with messages in the admin's language

const message = (key: string, language?: string) =>
  adminLabel(`admin.validation.${key}`)[language === 'ja' ? 'ja' : 'en']

// Price: empty (= "on request"), or a whole number of yen, 0 or more
export const validateWholeYen: NumberFieldSingleValidation = (value, { req }) =>
  value === null || value === undefined || (Number.isInteger(value) && value >= 0)
    ? true
    : message('wholeYen', req.i18n?.language)

// Year: empty, or 4 digits
export const validateYear: NumberFieldSingleValidation = (value, { req }) =>
  value === null || value === undefined || (Number.isInteger(value) && value >= 1000 && value <= 9999)
    ? true
    : message('year', req.i18n?.language)
