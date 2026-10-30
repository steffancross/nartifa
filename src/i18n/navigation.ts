import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

// Use these instead of next/link and next/navigation for internal pages, so the language never
// ends up written into a path by hand (Build Spec 00, convention 2)
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
