import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page, test } from '@playwright/test'
import { getPayload, type Payload } from 'payload'

import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// The artwork admin (Build Spec 07, Design Spec 09), in English. Works are seeded through the local
// API; the test runs outside a Next.js request, so it skips cache revalidation
const context = { skipRevalidate: true }
const senses = { sight: 'a', smell: 'b', taste: 'a', touch: 'b', hearing: 'a', feeling: 'joy' } as const
const prefix = 'e2e-admin'

let payload: Payload
let page: Page

// Everything the test makes is named with the prefix, so cleanup finds all of it, including
// anything an earlier run failed to remove
const removeTestData = async () => {
  await payload.delete({ collection: 'artworks', where: { searchText: { like: prefix } }, context })
  await payload.delete({ collection: 'media', where: { filename: { like: prefix } }, context })
  await payload.delete({ collection: 'series', where: { nameEn: { like: prefix } }, context })
}

const image = async (name: string) => {
  const data = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/small.png'))
  return payload.create({
    collection: 'media',
    data: {},
    file: { data, mimetype: 'image/png', name: `${prefix}-${name}.png`, size: data.length },
    context,
  })
}

const work = async (data: Record<string, unknown>) => {
  return payload.create({ collection: 'artworks', data, context })
}

// Any uncaught error in the admin pages fails the test it happened in
const pageErrors: string[] = []

const row = (title: string) => page.locator('tbody tr', { hasText: title })

const fixture = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/small.png'))
const pngFile = (name: string) => ({ name, mimeType: 'image/png', buffer: fixture })

// Images uploaded through the admin, found by name
const uploaded = async (namePart: string) =>
  (await payload.find({ collection: 'media', where: { filename: { like: namePart } }, depth: 0 })).docs

test.describe('Artwork admin', () => {
  test.beforeAll(async ({ browser }) => {
    payload = await getPayload({ config })
    await removeTestData()
    await seedTestUser()
    const mainImage = await image('main')
    await work({ titleJa: `${prefix} 公開`, titleEn: `${prefix} live`, ...senses, mainImage: mainImage.id, live: true, price: 22000 })
    await work({ titleEn: `${prefix} incomplete`, sight: 'a', live: true })
    await work({ titleJa: `${prefix} 非公開`, ...senses, mainImage: mainImage.id })
    await image('unused')

    page = await (await browser.newContext()).newPage()
    page.on('pageerror', (error) => pageErrors.push(`${page.url()}: ${error.message}`))
    await login({ page, user: testUser })
  })

  test.afterEach(() => {
    expect(pageErrors.splice(0)).toEqual([])
  })

  test.afterAll(async () => {
    await removeTestData()
    await cleanupTestUser()
  })

  test('/admin opens on the artworks table; the menu has Artworks, Collections, Images', async () => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/collections\/artworks/)

    // Under one "NARTIFA" heading; Accounts is not in the menu. (The current page's item is plain
    // text, the others are links)
    await expect(page.locator('#nav-group-NARTIFA .nav__link-label')).toHaveText(['Artworks', 'Collections', 'Images'])
    await expect(page.locator('nav .nav__link-label', { hasText: 'Accounts' })).toHaveCount(0)
  })

  test('the table shows title, price and status with what is missing', async () => {
    await page.goto(`/admin/collections/artworks?search=${prefix}`)

    // Japanese title first, English when there is no Japanese
    await expect(row(`${prefix} 公開`)).toContainText('¥22,000')
    await expect(row(`${prefix} 公開`).locator('.nartifa-status')).toHaveText('Live')
    // Just the status: what's missing shows on the work's page
    await expect(row(`${prefix} incomplete`).locator('.nartifa-status')).toHaveText('Incomplete')
    await expect(row(`${prefix} incomplete`)).toContainText('On request')
    await expect(row(`${prefix} 非公開`).locator('.nartifa-status')).toHaveText('Hidden')
    await expect(row(`${prefix} 公開`).locator('img')).toHaveAttribute('src', /^\/img\/media\/\d+\/thumb/)
  })

  test('the filter buttons filter by status', async () => {
    await page.goto(`/admin/collections/artworks?search=${prefix}`)
    await page.getByRole('button', { name: 'Incomplete', exact: true }).click()
    await expect(row(`${prefix} incomplete`)).toBeVisible()
    await expect(row(`${prefix} 公開`)).toHaveCount(0)
    await expect(row(`${prefix} 非公開`)).toHaveCount(0)

    await page.getByRole('button', { name: 'All', exact: true }).click()
    await expect(row(`${prefix} 公開`)).toBeVisible()
  })

  test('⋯ → Hide takes a live work off, Show puts it back', async () => {
    await page.goto(`/admin/collections/artworks?search=${prefix}`)
    const live = row(`${prefix} 公開`)

    await live.getByLabel('Actions').click()
    await page.getByRole('button', { name: 'Hide', exact: true }).click()
    await expect(live.locator('.nartifa-status')).toHaveText('Hidden')

    await live.getByLabel('Actions').click()
    await page.getByRole('button', { name: 'Show', exact: true }).click()
    await expect(live.locator('.nartifa-status')).toHaveText('Live')
  })

  test('⋯ → Show is greyed out on an incomplete work', async () => {
    await page.goto(`/admin/collections/artworks?search=${prefix}`)
    await row(`${prefix} incomplete`).getByLabel('Actions').click()
    // Payload draws a disabled menu item as plain text, not a button
    await expect(page.locator('.popup-button-list__disabled', { hasText: 'Show' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Show', exact: true })).toHaveCount(0)
    await page.keyboard.press('Escape')
  })

  test('⋯ → Delete asks first and says it cannot be recovered', async () => {
    const doomed = await work({ titleEn: `${prefix} delete me` })
    await page.goto(`/admin/collections/artworks?search=${prefix}`)

    await row(`${prefix} delete me`).getByLabel('Actions').click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    const dialog = page.locator('.confirmation-modal, [role="dialog"]').filter({ hasText: "can't be recovered" })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(row(`${prefix} delete me`)).toHaveCount(0)
    expect((await payload.find({ collection: 'artworks', where: { id: { equals: doomed.id } } })).totalDocs).toBe(0)
  })

  test('Live is greyed out until the work is complete; the note says what is needed', async () => {
    const complete = await work({ titleEn: `${prefix} switch`, ...senses, mainImage: (await image('switch')).id })
    await page.goto(`/admin/collections/artworks/${complete.id}`)
    const toggle = page.getByRole('switch', { name: 'Show on the site' })
    const note = page.getByTestId('status-note')

    await expect(toggle).toBeEnabled()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await expect(note).toHaveText('Not on the site')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await expect(note).toHaveText('On the site')

    // Emptying a required field turns it off and greys it out
    await page.locator('#field-smell .clear-indicator').click()
    await expect(toggle).toBeDisabled()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await expect(note).toHaveText("Can't be shown yet. Needs: Smell")
  })

  test('bad price and year are refused', async () => {
    await page.goto('/admin/collections/artworks/create')
    await expect(page.getByTestId('status-note')).toHaveText(
      "Can't be shown yet. Needs: Sight, Smell, Taste, Touch, Hearing, Feeling, Main image",
    )
    await expect(page.getByRole('switch', { name: 'Show on the site' })).toBeDisabled()

    await page.getByLabel('Title (English)').fill(`${prefix} form`)
    await page.getByLabel('Price (JPY)').fill('22000.5')
    await page.getByLabel('Year').fill('26')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Enter a whole number of yen')).toBeVisible()
    await expect(page.getByText('Enter a 4-digit year.')).toBeVisible()
    expect((await payload.count({ collection: 'artworks', where: { titleEn: { equals: `${prefix} form` } } })).totalDocs).toBe(0)
  })

  test('Images → Unused lists only images no work uses', async () => {
    await page.goto(`/admin/collections/media?search=${prefix}`)
    await expect(page.locator('tbody tr', { hasText: `${prefix}-main` })).toBeVisible()

    await page.getByRole('button', { name: 'Unused', exact: true }).click()
    await expect(page).toHaveURL(/where/)
    await expect(page.locator('tbody tr', { hasText: `${prefix}-unused` })).toBeVisible()
    await expect(page.locator('tbody tr', { hasText: `${prefix}-main` })).toHaveCount(0)
  })

  test("an item's page is just its form: no tabs, no ⋮ menu, Delete after Save", async () => {
    const doomed = await work({ titleEn: `${prefix} page delete` })
    await page.goto(`/admin/collections/artworks/${doomed.id}`)

    const save = page.getByRole('button', { name: 'Save', exact: true })
    const remove = page.locator('.doc-controls').getByRole('button', { name: 'Delete', exact: true })
    await expect(save).toBeVisible()
    await expect(page.locator('.doc-tabs li')).toHaveCount(0)
    await expect(page.locator('.doc-controls__popup')).toBeHidden()
    expect((await remove.boundingBox())!.x).toBeGreaterThan((await save.boundingBox())!.x)

    await remove.click()
    const dialog = page.locator('.confirmation-modal, [role="dialog"]').filter({ hasText: "can't be recovered" })
    await expect(dialog).toContainText(`${prefix} page delete`)
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(page).toHaveURL(/\/admin\/collections\/artworks(\?|$)/)
    expect((await payload.count({ collection: 'artworks', where: { id: { equals: doomed.id } } })).totalDocs).toBe(0)
  })

  test("a work's image fields upload straight in: Upload button inside Payload's box", async () => {
    const target = await work({ titleEn: `${prefix} upload target` })
    await page.goto(`/admin/collections/artworks/${target.id}`)
    const [mainField, extraField] = [page.locator('.nartifa-image-field').nth(0), page.locator('.nartifa-image-field').nth(1)]

    await expect(mainField.locator('.upload__dropzoneContent')).toContainText('Upload image')
    await expect(extraField.locator('.upload__dropzoneContent')).toContainText('Upload images')
    // Payload's own "Create new" is off
    await expect(page.getByRole('button', { name: 'Create New' })).toHaveCount(0)

    const stamp = Date.now()
    await mainField.locator('input[type=file]').setInputFiles(pngFile(`${prefix}-main-up-${stamp}.png`))
    await expect(mainField).toContainText(`${prefix}-main-up-${stamp}`)
    await extraField
      .locator('input[type=file]')
      .setInputFiles([pngFile(`${prefix}-extra-up-a-${stamp}.png`), pngFile(`${prefix}-extra-up-b-${stamp}.png`)])
    await expect(extraField).toContainText(`${prefix}-extra-up-a-${stamp}`)
    await expect(extraField).toContainText(`${prefix}-extra-up-b-${stamp}`)

    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('.payload-toast-container')).toContainText(/success/i)

    const [main] = await uploaded(`${prefix}-main-up-${stamp}`)
    const extras = await uploaded(`${prefix}-extra-up-`)
    const saved = await payload.findByID({ collection: 'artworks', id: target.id, depth: 0 })
    expect(saved.mainImage).toBe(main.id)
    expect(saved.extraImages).toEqual(extras.map((doc) => doc.id).sort((a, b) => a - b))
  })

  test('a file that cannot be uploaded is stopped when picked, with a clear message', async () => {
    const target = await work({ titleEn: `${prefix} bad file` })
    await page.goto(`/admin/collections/artworks/${target.id}`)
    const stamp = Date.now()

    await page
      .locator('.nartifa-image-field')
      .nth(1)
      .locator('input[type=file]')
      .setInputFiles({ name: `${prefix}-bad-${stamp}.heic`, mimeType: 'image/heic', buffer: fixture })
    await expect(page.getByText('Only JPG, PNG or WebP images can be uploaded')).toBeVisible()
    expect(await uploaded(`${prefix}-bad-${stamp}`)).toHaveLength(0)
  })

  test('Images → Create new is just the file picker, and saves the image once', async () => {
    await page.goto('/admin/collections/media/create')
    await expect(page.getByText('In use', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Main image of')).toHaveCount(0)

    const stamp = Date.now()
    await page.locator('input[type=file]').first().setInputFiles(pngFile(`${prefix}-create-${stamp}.png`))
    await expect(page).toHaveURL(/\/admin\/collections\/media\/\d+$/)
    await expect(page.getByText('In use', { exact: true })).toBeVisible()

    // Saved once, even after the page has settled
    await page.waitForTimeout(1000)
    expect(await uploaded(`${prefix}-create-${stamp}`)).toHaveLength(1)
  })

  test("a collection's page lists its works", async () => {
    const series = await payload.create({ collection: 'series', data: { nameJa: 'e2e一覧', nameEn: `${prefix} list` }, context })
    await work({ titleEn: `${prefix} in collection`, series: [series.id] })

    await page.goto(`/admin/collections/series/${series.id}`)
    await expect(page.getByText('Works in this collection')).toBeVisible()
    await expect(page.getByText(`${prefix} in collection`)).toBeVisible()
  })
})
