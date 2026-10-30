import fs from 'fs'
import path from 'path'
import { type CloudflareContext, getCloudflareContext } from '@opennextjs/cloudflare'
import type { GetPlatformProxyOptions } from 'wrangler'

// The Worker's bindings (D1, R2, IMAGES…) for any code that needs them: payload.config, hooks, the
// image route. On the Worker they come from OpenNext. Everywhere else — pnpm dev, payload CLI
// scripts, next build, tests — from wrangler's platform proxy: local resources, or the real ones
// when NODE_ENV=production (the bindings are remote: true; Build Spec 01).
// Only env is returned: the context's ctx (waitUntil) belongs to one request and is never reused

const realpath = (value: string) => {
  try {
    return fs.existsSync(value) ? fs.realpathSync(value) : undefined
  } catch {
    return undefined
  }
}

const isCLI = process.argv.some((value) => {
  const resolved = realpath(value)
  if (!resolved) return false
  return (
    resolved.endsWith(path.join('payload', 'bin.js')) ||
    resolved.endsWith(path.join('next', 'dist', 'bin', 'next'))
  )
})
const isProduction = process.env.NODE_ENV === 'production'

let context: Promise<CloudflareContext> | undefined

export async function getCloudflareEnv(): Promise<CloudflareEnv> {
  context ??= isCLI || !isProduction ? getCloudflareContextFromWrangler() : getCloudflareContext({ async: true })
  return (await context).env
}

// Adapted from https://github.com/opennextjs/opennextjs-cloudflare/blob/d00b3a13e42e65aad76fba41774815726422cc39/packages/cloudflare/src/api/cloudflare-context.ts#L328C36-L328C46
function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        environment: process.env.CLOUDFLARE_ENV,
        remoteBindings: isProduction,
      } satisfies GetPlatformProxyOptions),
  )
}
