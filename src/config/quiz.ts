// The quiz's senses and option keys (Design Spec 04). Artworks store these keys, never words: the
// words live in i18n (quiz.*) so changing one is a text edit that never touches data (convention 5)

export const SENSES = ['sight', 'smell', 'taste', 'touch', 'hearing'] as const
export type Sense = (typeof SENSES)[number]

export const SENSE_OPTIONS = ['a', 'b'] as const
export type SenseOption = (typeof SENSE_OPTIONS)[number]

// Exactly one feeling per work, fixed for now
export const FEELINGS = ['joy', 'anger', 'sorrow', 'delight'] as const
export type Feeling = (typeof FEELINGS)[number]
