import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

// Read → save → fresh read, through the real admin API on the local database (Build Spec 08).
// pnpm dev refreshes caches on every request anyway, so this checks the wiring (lib/data.ts read,
// Media hook), not that pages are cached; that is the live page-cache check (checklist Verify)
const user = { email: 'e2e-cache@nartifa.test', password: 'e2e-cache-test-password' }
// 1×1 transparent PNG
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

test('the landing count follows uploads and deletes', async ({ request }) => {
  const count = async () => {
    const html = await (await request.get('/', { headers: { 'accept-language': 'en' } })).text()
    return Number(html.match(/data-testid="media-count">(\d+)/)?.[1])
  }

  const login = await request.post('/api/users/login', { data: user })
  expect(login.ok()).toBe(true)
  const auth = { Authorization: `JWT ${(await login.json()).token}` }

  const before = await count()
  expect(Number.isInteger(before)).toBe(true)

  const upload = await request.post('/api/media', {
    headers: auth,
    multipart: {
      file: { name: 'e2e-cache.png', mimeType: 'image/png', buffer: png },
    },
  })
  expect(upload.ok()).toBe(true)
  const { doc } = await upload.json()
  expect(await count()).toBe(before + 1)

  const removed = await request.delete(`/api/media/${doc.id}`, { headers: auth })
  expect(removed.ok()).toBe(true)
  expect(await count()).toBe(before)
})
