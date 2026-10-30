import { IMAGE_CACHE_CONTROL, type ImageCollection } from '@/config/images'
import { getCloudflareEnv } from '@/lib/cloudflare'
import { makeSize, type ImageBytes } from '@/lib/image-transform'
import { derivedKey, parseImagePath } from '@/lib/images'

// /img/{collection}/{id}/{size}?v=… (Build Spec 05). Serves the stored WebP from derived/; ?v= only
// busts browser caches and is ignored here. A missing size (e.g. one added to the config later) is
// made from the original, stored, then served. No Payload: one R2 read, plus one D1 query on a rebuild.
// Outside [locale] and skipped by proxy.ts, so no language handling

const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })

// Where the original is: the R2 plugin stores it at {prefix}/{filename} (prefix 'media', 02)
async function originalKey(env: CloudflareEnv, collection: ImageCollection, id: number): Promise<string | null> {
  const row = await env.D1.prepare(`SELECT filename, prefix FROM ${collection} WHERE id = ?`)
    .bind(id)
    .first<{ filename: string | null; prefix: string | null }>()
  if (!row?.filename) return null
  return row.prefix ? `${row.prefix}/${row.filename}` : row.filename
}

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const target = parseImagePath((await params).path)
  if (!target) return notFound()
  const { collection, id, size } = target

  const env = await getCloudflareEnv()
  const key = derivedKey(collection, id, size)
  const headers = { 'Content-Type': 'image/webp', 'Cache-Control': IMAGE_CACHE_CONTROL[collection] }

  const stored = await env.R2.get(key)
  if (stored) return new Response(stored.body, { headers: { ...headers, ETag: stored.httpEtag } })

  // Rebuild from the original
  const source = await originalKey(env, collection, id)
  const original = source ? await env.R2.get(source) : null
  if (!original) return notFound()

  const bytes = await makeSize(env.IMAGES, new Uint8Array(await original.arrayBuffer()) as ImageBytes, size)
  await env.R2.put(key, new Blob([bytes]), { httpMetadata: { contentType: 'image/webp' } })
  return new Response(bytes, { headers })
}
