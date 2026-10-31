import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: { en: 'Account', ja: 'アカウント' },
    plural: { en: 'Accounts', ja: 'アカウント' },
  },
  admin: {
    useAsTitle: 'email',
    // Not in the menu: accounts are made with pnpm seed-admin (docs/Admin Accounts.md). Your own
    // account is still under the avatar
    group: false,
  },
  auth: true,
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
}
