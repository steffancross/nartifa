import { expect, test } from '@playwright/test'

// Language choice and 404s (Build Spec 03). Requests go through proxy.ts like a real visit
const htmlLang = (html: string) => html.match(/<html[^>]*\blang="([^"]+)"/)?.[1]

test.describe('Language from the request', () => {
  const cases: { name: string; headers: Record<string, string>; expected: 'ja' | 'en' }[] = [
    { name: 'no Accept-Language → ja', headers: {}, expected: 'ja' },
    { name: 'Japanese browser → ja', headers: { 'accept-language': 'ja-JP,ja;q=0.9' }, expected: 'ja' },
    { name: 'English browser → en', headers: { 'accept-language': 'en-US,en;q=0.9' }, expected: 'en' },
    { name: 'first entry wins: "fr, ja" → en', headers: { 'accept-language': 'fr, ja' }, expected: 'en' },
    {
      name: 'lang cookie beats the browser',
      headers: { 'accept-language': 'ja', cookie: 'lang=en' },
      expected: 'en',
    },
  ]

  for (const { name, headers, expected } of cases) {
    test(name, async ({ request }) => {
      const response = await request.get('/', { headers })
      expect(response.status()).toBe(200)
      expect(htmlLang(await response.text())).toBe(expected)
    })
  }
})

test.describe('Not found', () => {
  test('unknown path → localized 404', async ({ request }) => {
    const ja = await request.get('/no-such-page', { headers: { 'accept-language': 'ja' } })
    expect(ja.status()).toBe(404)
    expect(await ja.text()).toContain('ページが見つかりません')

    const en = await request.get('/no-such-page', { headers: { 'accept-language': 'en' } })
    expect(en.status()).toBe(404)
    expect(await en.text()).toContain('Page not found')
  })

  test('unsupported language folder → 404', async ({ request }) => {
    const response = await request.get('/fr', { headers: { 'accept-language': 'ja' } })
    expect(response.status()).toBe(404)
  })
})

test.describe('Language toggle', () => {
  test('switches on the same URL and remembers it for a year', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'ja-JP' })
    const page = await context.newPage()

    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja')

    await page.getByRole('button', { name: 'English' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page).toHaveURL('/')

    const cookie = (await context.cookies()).find((c) => c.name === 'lang')
    expect(cookie?.value).toBe('en')
    const daysLeft = (cookie!.expires - Date.now() / 1000) / 86400
    expect(daysLeft).toBeGreaterThan(360)

    // A fresh visit with the same cookie stays English despite the Japanese browser
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    await context.close()
  })
})

test.describe('Paths the proxy must not touch', () => {
  test('Payload admin and API', async ({ request }) => {
    const admin = await request.get('/admin/login')
    expect(admin.status()).toBe(200)
    expect(await admin.text()).toContain('Payload')

    const api = await request.get('/api/users/me')
    expect(api.status()).toBe(200)
    expect(await api.json()).toHaveProperty('user')
  })
})
