import {
  IMAGE_COLLECTIONS,
  IMAGE_LIMITS,
  type ImageCollection,
  type ImageSize,
} from '@/config/images'

// Pure helpers for the image pipeline (Build Spec 05). No bindings here, so they're unit tested

type Dimensions = { width?: number | null; height?: number | null }

// /img/media/12/lg?v=1761800000000. v changes when the image is replaced, so browsers never keep a stale one
export function imageUrl(
  collection: ImageCollection,
  image: { id: number; updatedAt?: string | null },
  size: ImageSize,
): string {
  const url = `/img/${collection}/${image.id}/${size}`
  const version = image.updatedAt ? Date.parse(image.updatedAt) : NaN
  return Number.isNaN(version) ? url : `${url}?v=${version}`
}

export function derivedPrefix(collection: ImageCollection, id: number): string {
  return `derived/${collection}/${id}/`
}

export function derivedKey(collection: ImageCollection, id: number, size: ImageSize): string {
  return `${derivedPrefix(collection, id)}${size}.webp`
}

export function sizesFor(collection: ImageCollection): readonly ImageSize[] {
  return IMAGE_COLLECTIONS[collection]
}

// The route's path segments → what to serve, or null for anything that isn't a known collection, a
// whole-number id and a size that collection has
export function parseImagePath(
  segments: string[],
): { collection: ImageCollection; id: number; size: ImageSize } | null {
  if (segments.length !== 3) return null
  const [collection, idText, size] = segments
  if (!Object.hasOwn(IMAGE_COLLECTIONS, collection)) return null
  if (!/^[1-9]\d{0,15}$/.test(idText)) return null
  const sizes: readonly string[] = IMAGE_COLLECTIONS[collection as ImageCollection]
  if (!sizes.includes(size)) return null
  return { collection: collection as ImageCollection, id: Number(idText), size: size as ImageSize }
}

// Over the Images binding's limits (100 MP, or a side over 50,000px)
export function exceedsPixelLimit({ width, height }: Dimensions): boolean {
  if (!width || !height) return false
  return width * height > IMAGE_LIMITS.maxPixels || Math.max(width, height) > IMAGE_LIMITS.maxSide
}

// True when the binding's output is portrait and the stored size landscape, or the other way round:
// a phone photo saved sideways with an EXIF rotation tag, which Payload records unrotated
export function needsOrientationSwap(stored: Dimensions, output: Dimensions): boolean {
  const { width: sw, height: sh } = stored
  const { width: ow, height: oh } = output
  if (!sw || !sh || !ow || !oh || sw === sh || ow === oh) return false
  return sw > sh !== ow > oh
}
