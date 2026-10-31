// The one heading over the admin menu (Artworks · Collections · Images). Payload's default heading
// is "Collections", which would read as the artist's collections (Build Spec 07)
export const ADMIN_GROUP = { en: 'NARTIFA', ja: 'NARTIFA' }

// An item's page (artwork, collection, image) is just its form (Build Spec 07): no Edit / API
// tabs, and Delete as its own button next to Save (src/admin/DeleteButton.tsx) in place of
// Payload's ⋮ menu (hidden in custom.scss). Spread into each collection's admin.components, with
// hideAPIURL: true in admin and disableDuplicate: true on the collection
export const ITEM_PAGE_COMPONENTS = {
  edit: { beforeDocumentControls: ['@/admin/DeleteButton#DeleteButton'] },
  // With API gone, Edit would be a tab bar of one
  views: { edit: { default: { tab: { condition: () => false } } } },
}
