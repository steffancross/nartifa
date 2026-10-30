import { IMAGE_OUTPUT, IMAGE_SIZES, type ImageSize } from '@/config/images'

// Runs the Images binding (Build Spec 05). Server only: needs env.IMAGES

export type ImageBytes = Uint8Array<ArrayBuffer>

const stream = (bytes: ImageBytes) => new Blob([bytes]).stream()

// One named size as WebP
export async function makeSize(images: ImagesBinding, original: ImageBytes, size: ImageSize): Promise<ImageBytes> {
  const result = await images.input(stream(original)).transform(IMAGE_SIZES[size]).output(IMAGE_OUTPUT)
  return new Uint8Array(await result.response().arrayBuffer())
}

// Every listed size, one after another (each holds the decoded original in memory)
export async function makeSizes(
  images: ImagesBinding,
  original: ImageBytes,
  sizes: readonly ImageSize[],
): Promise<Map<ImageSize, ImageBytes>> {
  const results = new Map<ImageSize, ImageBytes>()
  for (const size of sizes) results.set(size, await makeSize(images, original, size))
  return results
}

// Width and height of an image the binding made (info() is free)
export async function outputDimensions(
  images: ImagesBinding,
  bytes: ImageBytes,
): Promise<{ width: number; height: number } | null> {
  const info = await images.info(stream(bytes))
  return 'width' in info ? { width: info.width, height: info.height } : null
}

// Cloudflare's "image too large" (over 100 MP or 50,000px a side)
export function isTooLargeError(error: unknown): boolean {
  const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown }
  return code === 9413 || String(message ?? '').includes('9413')
}
