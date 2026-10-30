import path from 'path'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import { r2Storage } from '@payloadcms/storage-r2'
import { en } from '@payloadcms/translations/languages/en'
import { ja } from '@payloadcms/translations/languages/ja'

import { Artworks } from './collections/Artworks'
import { Media } from './collections/Media'
import { Series } from './collections/Series'
import { Users } from './collections/Users'
import { getCloudflareEnv } from './lib/cloudflare'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const isProduction = process.env.NODE_ENV === 'production'

const createLog =
  (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      fn(JSON.stringify({ level, msg: objOrMsg }))
    } else {
      fn(JSON.stringify({ level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg }))
    }
  }

const cloudflareLogger = {
  level: process.env.PAYLOAD_LOG_LEVEL || 'info',
  trace: createLog('trace', console.debug),
  debug: createLog('debug', console.debug),
  info: createLog('info', console.log),
  warn: createLog('warn', console.warn),
  error: createLog('error', console.error),
  fatal: createLog('fatal', console.error),
  silent: () => {},
} as any // Use PayloadLogger type when it's exported

// D1 and R2 for Payload; where they come from (Worker, local proxy, real resources) is in lib/cloudflare.ts
const env = await getCloudflareEnv()

export default buildConfig({
  admin: {
    user: Users.slug,
    // Dark for now (decided 2026-10-30); the design's light admin colors come later (Design Spec Tokens)
    theme: 'dark',
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Artworks, Series, Media, Users],
  // Content languages: artwork fields have ja/en values, Japanese first (Build Spec 02, 03)
  localization: {
    locales: [
      { code: 'ja', label: '日本語' },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'ja',
    fallback: true,
  },
  // The admin's own interface language, switchable in account settings (Build Spec 07)
  i18n: {
    supportedLanguages: { en, ja },
  },
  // Matches the Images binding's 20 MB input limit (Build Spec 05)
  upload: {
    limits: { fileSize: 20_000_000 },
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // autoIncrement: ids are never reused after a delete. Work ids are permanent URLs (/works/12),
  // and SQLite can't add AUTOINCREMENT to an existing table, so this must be on before the first migration
  db: sqliteD1Adapter({ binding: env.D1, autoIncrement: true }),
  logger: isProduction ? cloudflareLogger : undefined,
  plugins: [
    r2Storage({
      bucket: env.R2,
      // Originals under media/ in the one bucket (Build Spec 02, R2 layout)
      collections: { media: { prefix: 'media' } },
    }),
  ],
})

