# Tokens

**Status: Decided.** Values turn the wireframe direction (dark, minimal, quiet type) into a system.

The public site is dark. The admin is light (see the end of this file).

## Color — public site

| Token | Value | Use |
| --- | --- | --- |
| `bg` | `#0D0D0D` | Page background |
| `surface` | `#161616` | Overlays, upload sheet, photo view backdrop |
| `surface-2` | `#1F1F1F` | Input fields, image placeholders |
| `line` | `#2E2E2E` | Dividers, input borders |
| `text` | `#EDEDEA` | Main text |
| `text-2` | `#A3A39E` | Secondary text (price, captions, meta) |
| `text-3` | `#6E6E6A` | Hints, disabled. Not for body text |
| `accent` | `#EDEDEA` | Selected state = inverted (light fill, dark text) |
| `pin` | `#FFFFFF` | Globe pins — **until the artist's custom pin image arrives** (see 07) |
| `error` | `#E5806B` | Form errors only |

No brand color is set. Selection and focus use inversion (light on dark), not a hue. If the artist wants one color, it should be used only for the globe pins and the selected quiz option.

Contrast: `text` and `text-2` on `bg` both pass 4.5:1. `text-3` does not — use it only for non-essential hints.

## Type

Base fonts for now — **likely to be swapped later.** Define families in one place so a swap is a one-line change.

| Role | Family |
| --- | --- |
| Latin | Instrument Sans (Google Fonts) |
| Japanese | Zen Kaku Gothic New (Google Fonts) |
| Small labels / numbers | JetBrains Mono |

Stack: `"Instrument Sans", "Zen Kaku Gothic New", system-ui, sans-serif`. Latin glyphs come from the first family, kana and kanji fall through to the second.

| Token | Size / line height (mobile) | Desktop | Weight | Use |
| --- | --- | --- | --- | --- |
| `display` | 32 / 1.2 | 48 / 1.15 | 400 | Landing line, quiz question |
| `title` | 22 / 1.3 | 28 / 1.3 | 400 | Artwork title, page titles |
| `body` | 16 / 1.7 | 17 / 1.7 | 400 | Descriptions, About text |
| `small` | 14 / 1.6 | 14 / 1.6 | 400 | Price, meta, captions, menu items |
| `label` | 12 / 1.4 | 12 / 1.4 | 400, mono, +0.04em | Step counter, field labels |

- Japanese body: line height 1.8 (one step more than English). This applies to any Japanese text, including Japanese artwork text shown on an English page.
- No bold in the public site except where noted. Hierarchy comes from size and color.
- Minimum text size is 12px. Inputs are 16px so phones don't zoom.

## Spacing

4px base. Use only these steps: `4, 8, 12, 16, 24, 32, 48, 64, 96`.

| Token | Value | Use |
| --- | --- | --- |
| Page margin (mobile) | 20 | Left/right edge |
| Page margin (desktop) | 48 | Left/right edge |
| Max content width | 1200 | Grids, artwork detail |
| Max text width | 640 | About, descriptions |
| Grid gap | 12 mobile / 24 desktop | All Works (see 06) |

## Shape

- Corner radius: **0** on images and artwork. 4px on buttons and inputs. Pins are circles (until the custom pin image).
- No shadows. Overlays separate by `surface` color, not shadow.

## Touch targets

Every tappable element at least 44×44px, even if the visible part is smaller (menu icon, ✕, back arrow, globe pins).

## Breakpoints

| Name | Width | Notes |
| --- | --- | --- |
| Mobile | < 768 | Base design |
| Tablet | 768–1199 | Mobile layout, wider margins, 3-column grid |
| Desktop | ≥ 1200 | Side-by-side layouts (artwork detail, upload panel) |

## Motion

Quiet and short. Nothing bounces.

| Token | Value | Use |
| --- | --- | --- |
| `fast` | 150ms ease-out | Hover, selection highlight |
| `base` | 250ms ease-out | Overlays opening/closing, step change |
| `slow` | 600ms ease-out | Artwork reveal fade-in |

Respect `prefers-reduced-motion`: replace movement with a simple fade or no animation. This includes the globe's auto-rotate.

## Admin colors

Plain light UI. Use the CMS defaults where they exist.

| Token | Value |
| --- | --- |
| `bg` | `#FAF9F7` |
| `surface` | `#FFFFFF` |
| `line` | `#E0E0DA` |
| `text` | `#1A1A1A` |
| `text-2` | `#555555` |
| `primary` | `#1A1A1A` (buttons) |
| `danger` | `#A33333` (delete, reject) |
| `status-live` | `#2E7D4F` |
| `status-hidden` | `#8A8A84` |
| `status-incomplete` | `#B5772A` |
