import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

// Originals are never public: only logged-in admins can read media or its files. The named sizes
// are public through /img (Build Spec 05)
const user = { email: 'e2e-media@nartifa.test', password: 'e2e-media-test-password' }
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

const removeUser = async () => {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: user.email } } })
}

test.beforeAll(async () => {
  await removeUser()
  const payload = await getPayload({ config })
  await payload.create({ collection: 'users', data: user })
})

test.afterAll(removeUser)

test('media files and records need a login', async ({ playwright }) => {
  const anonymous = await playwright.request.newContext({ baseURL: 'http://localhost:3000' })
  const admin = await playwright.request.newContext({ baseURL: 'http://localhost:3000' })

  const login = await admin.post('/api/users/login', { data: user })
  expect(login.ok()).toBe(true)
  const auth = { Authorization: `JWT ${(await login.json()).token}` }

  const upload = await admin.post('/api/media', {
    headers: auth,
    multipart: { file: { name: 'e2e-access.png', mimeType: 'image/png', buffer: png } },
  })
  expect(upload.ok()).toBe(true)
  const { doc } = await upload.json()

  try {
    expect(doc.prefix).toBe('media')
    expect((await anonymous.get(`/api/media/${doc.id}`)).status()).toBe(403)
    expect((await anonymous.get(doc.url)).status()).toBe(403)
    expect((await admin.get(doc.url, { headers: auth })).status()).toBe(200)

    // The sizes are public, through the real dev server (proxy.ts leaves /img alone)
    const card = await anonymous.get(`/img/media/${doc.id}/card`)
    expect(card.status()).toBe(200)
    expect(card.headers()['content-type']).toBe('image/webp')
    expect(card.headers()['cache-control']).toBe('public, max-age=31536000, immutable')
    expect((await anonymous.get(`/img/media/${doc.id}/nope`)).status()).toBe(404)

    // The admin's previews use the uncropped 400px size, not the original
    expect(doc.thumbnailURL).toMatch(new RegExp(`^/img/media/${doc.id}/preview\\?v=\\d+$`))
  } finally {
    await admin.delete(`/api/media/${doc.id}`, { headers: auth })
    await anonymous.dispose()
    await admin.dispose()
  }
})

test('the login page has no "Forgot password?" link', async ({ page }) => {
  await page.goto('/admin/login')
  await expect(page.locator('input[name="email"]')).toBeVisible()
  await expect(page.locator('a[href$="/forgot"]')).toBeHidden()
})
