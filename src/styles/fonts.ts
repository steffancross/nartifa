import { Instrument_Sans, JetBrains_Mono, Zen_Kaku_Gothic_New } from 'next/font/google'

// The site's fonts, in one place so a swap is a change here only (Design Spec Tokens: "likely to be
// swapped later"). Downloaded at build time and served from the site, so browsers never call Google

export const latin = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-latin',
})

// Google serves Japanese fonts in ~120 slices by character range and the browser fetches only the
// slices a page uses. There's no single Japanese subset to preload, hence preload: false
export const japanese = Zen_Kaku_Gothic_New({
  weight: '400',
  display: 'swap',
  preload: false,
  variable: '--font-ja',
})

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-mono',
})

export const fontVariables = [latin.variable, japanese.variable, mono.variable].join(' ')
