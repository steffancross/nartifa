import { SENSES } from './quiz'

// What a work needs before it can be shown (Build Spec 02, Status rule). Changing this list changes
// what counts as complete; existing works pick it up the next time they are saved
export const REQUIRED_FIELDS = [...SENSES, 'feeling', 'mainImage'] as const
export type RequiredField = (typeof REQUIRED_FIELDS)[number]
