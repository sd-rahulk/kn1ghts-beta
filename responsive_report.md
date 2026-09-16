# KN1GHTS responsive QA report

Date: 2026-09-16  
Final status: **PASS after remediation**  
Test target: optimized Next.js production build on `http://localhost:3000`

## Executive summary

The complete single-page experience was audited at 16 viewport/device-pixel-ratio combinations. Every one of the 11 chapters was checked at every size (176 chapter-level audits), and 101 production screenshots were captured. The final run completed with:

- 0 horizontal document overflows
- 0 chapter-level element overflows
- 0 runtime errors or console warnings
- 0 unexpected network failures
- 0 broken images
- 0 duplicate IDs
- 0 unlabeled controls
- 0 undersized mobile menu/header targets
- 0 external-link attribute issues
- 1 `h1`, 11 chapters, and 11 menu destinations at every viewport

The machine-readable results are in [`responsive_screenshots/results.json`](responsive_screenshots/results.json). The repeatable test harness is [`scripts/responsive-qa.mjs`](scripts/responsive-qa.mjs) and can be run with `npm run qa:responsive` while Chrome remote debugging and the production server are active.

## Device and viewport coverage

| Profile | CSS viewport | DPR | Final result |
|---|---:|---:|---|
| Tiny phone | 280 × 653 | 2 | Pass |
| Small phone | 320 × 568 | 2 | Pass |
| Android phone | 360 × 740 | 3 | Pass |
| iPhone portrait | 390 × 844 | 3 | Pass |
| Large phone | 430 × 932 | 3 | Pass |
| Foldable / small tablet | 540 × 720 | 2 | Pass |
| Short phone landscape | 667 × 375 | 2 | Pass |
| Phone landscape | 844 × 390 | 3 | Pass |
| Tablet portrait | 768 × 1024 | 2 | Pass |
| Large tablet | 820 × 1180 | 2 | Pass |
| Tablet landscape | 1024 × 768 | 2 | Pass |
| Small laptop | 1280 × 720 | 1 | Pass |
| Laptop | 1366 × 768 | 1 | Pass |
| Desktop | 1440 × 900 | 1 | Pass |
| Full HD | 1920 × 1080 | 1 | Pass |
| Ultrawide | 2560 × 1080 | 1 | Pass |

The browser was also resized live from 390 × 844 portrait to 844 × 390 landscape and back. The canvas, header, scroll triggers, and content remained within the viewport in both orientations.

## What was tested

### Layout and visual presentation

- All 11 chapters at all 16 profiles: Home, Updates, Approach, Disciplines, Results, Writeups, Projects, Team, Journal, Recruitment, and Contact.
- Horizontal overflow, off-screen chapter children, sticky content, section height, fixed header bounds, and WebGL canvas dimensions.
- Fully opened navigation on eight representative profiles, including short landscape and 280 px width.
- Safe-area handling, ultrawide composition, short-height layouts, orientation changes, and high-DPR rendering.
- Manual review of every tiny-phone and Full-HD chapter screenshot, followed by focused review of menus and the corrected Projects composition.

### Features and interaction

- Loader active state, percentage/status semantics, completion, and experience reveal.
- Menu open/close, body scroll lock, overlay scrollability, `Escape` close, focus placement, background inertness, and all 11 navigation jumps.
- Wordmark back-to-top behavior and keyboard-visible skip link.
- Internal anchors and external links, including `_blank` and `rel="noreferrer"`.
- Reduced-motion preference: reveal content remains visible, horizontal transforms are disabled, and decorative grain is removed.
- Responsive GSAP refresh behavior and canvas resizing.

### Real-world failure and content stress

- Blocked remote portraits and web fonts: all four portraits switched to local placeholders, with no broken-image icons or overflow.
- Expanded content: eight team members and six results on mobile, short desktop, and desktop; no section spill or document overflow.
- Extremely long unbroken headings/body text; no horizontal overflow.
- Touch targets, missing labels, duplicate IDs, font readiness, and image natural dimensions.

## Issues found and fixed

| Severity | Issue | Resolution | Retest |
|---|---|---|---|
| High | Desktop-oriented absolute/sticky layouts did not reliably reflow on phones and tablets. | Added responsive layout modes at 1100, 800, and 420 px, plus short-landscape rules. Horizontal writeups become a vertical list on compact layouts. | Pass across all 16 profiles. |
| High | Fixed chapter heights could clip larger real-world result, writeup, or team data sets. | Heights now derive from item counts and retain responsive minimums. | 8-member/6-result stress data produced 0 px spill at all three stress profiles. |
| High | Horizontal GSAP travel was calculated once and could become stale after resize/orientation changes. | Moved it into `gsap.matchMedia`, made distance responsive, enabled invalidation, and limited horizontal tracking to desktop/no-motion-preference. | Live orientation and all breakpoint transitions pass. |
| Medium | The desktop Projects heading and card occupied the same right-side area and visibly overlapped. | Separated desktop copy and card into left/right composition columns. | Manually verified in Full-HD and automated at 1280–2560 px. |
| Medium | The menu lacked complete modal focus behavior and an Escape path. | Added dialog semantics, initial focus, background inertness, focus restoration, Escape handling, and hidden-menu tab exclusion. | All menu interaction checks pass. |
| Medium | Failed remote portraits could remain as broken images. | Added a reusable portrait component with pre/post-hydration error detection and a local placeholder. | With image/font hosts blocked: 4 cards, 4 placeholders, 0 broken images. |
| Medium | Motion-heavy reveals, grain, tracking, and WebGL effects did not fully honor reduced motion. | Added reduced-motion CSS/animation paths and bypassed scroll transforms. | Emulated `prefers-reduced-motion: reduce` passes. |
| Medium | Mobile WebGL retained desktop scene scale and particle load. | Reduced particle draw count and world/camera travel at compact widths. | Canvas matches every tested viewport and remains visually composed. |
| Medium | Small screens and notched devices needed explicit safe-area and minimum-touch-target handling. | Added `viewport-fit=cover`, environment insets, 44 px targets, coarse-pointer behavior, and short-landscape menu rules. | 0 undersized audited controls; menu remains scrollable when needed. |
| Low | Long unbroken content could escape card/section bounds. | Added defensive wrapping to chapter content and responsive card sizing. | Long-string stress test reports 0 px overflow. |
| Low | The production browser console reported a missing favicon request. | Added `app/icon.svg` through Next.js metadata routing. | Final run: 0 runtime warnings and 0 network failures. |
| Low | `npm run lint` used the removed Next.js 16 `next lint` command. | Added the supported ESLint 9 flat configuration and updated the script to the ESLint CLI. | `npm run lint`: pass with 0 warnings. |

## Screenshot evidence

The `responsive_screenshots` directory contains 101 JPEGs (about 13 MB): every chapter plus the open menu for eight representative device profiles, and five focused feature/failure-mode captures.

Representative evidence:

- [280 px Home](responsive_screenshots/tiny-phone-home.jpg)
- [280 px open menu](responsive_screenshots/tiny-phone-menu.jpg)
- [390 px Team](responsive_screenshots/iphone-team.jpg)
- [Phone landscape menu](responsive_screenshots/phone-landscape-menu.jpg)
- [Tablet portrait Writeups](responsive_screenshots/tablet-portrait-writeups.jpg)
- [Laptop Results](responsive_screenshots/laptop-results.jpg)
- [Full-HD Projects](responsive_screenshots/full-hd-projects.jpg)
- [Full-HD open menu](responsive_screenshots/full-hd-menu.jpg)
- [Ultrawide Contact](responsive_screenshots/ultrawide-contact.jpg)
- [Loader active state](responsive_screenshots/feature-loader-active.jpg)
- [Reduced-motion state](responsive_screenshots/feature-reduced-motion.jpg)
- [Blocked-asset fallback](responsive_screenshots/feature-blocked-assets-fallback.jpg)
- [Live landscape rotation](responsive_screenshots/feature-live-orientation-landscape.jpg)

## Final validation commands

| Command/check | Result |
|---|---|
| `npm run build` | Pass; optimized static production build generated |
| `npm run lint` | Pass; 0 errors and 0 warnings |
| `npx tsc --noEmit` | Pass |
| `npm run qa:responsive` | Pass; 16 profiles, 101 screenshots, 0 runtime/network failures |
| `git diff --check` | Pass |
| Dependency audit | 0 known vulnerabilities after ESLint setup |

## Test boundaries

This is broad Chromium viewport/DPR emulation and visual inspection, not a claim that every physical browser/GPU combination in existence was exercised. Physical iOS Safari, Firefox, low-memory Android hardware, assistive-technology screen readers, and throttled cellular performance should still be included in pre-launch device-lab testing. External social destinations were checked for correct, secure link configuration; their third-party authenticated pages were not tested as part of this repository.
