# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@openfactu/ui` — React 19 component library for the Keirost design system, consumed mainly by `D:\dev\platform`. Docs, comments, story names and UI copy are in **Spanish**; keep new ones in Spanish.

## Commands

```bash
npm run dev          # Ladle playground at http://localhost:61000 (stories/**/*.stories.tsx)
npm run build        # tsc -> dist/ (only src/, stories excluded)
npm run typecheck    # tsc over src + stories + .ladle
npm test             # node:test unit tests: scripts/code-editor.test.cjs, scripts/ai.test.cjs
node --test --test-name-pattern="indentation" scripts/code-editor.test.cjs   # single test
npm run test:browser # Playwright probes, group `browser` of scripts/test-browser.cjs; needs Ladle running + Chrome
node scripts/test-browser.cjs chat extra    # other groups (chat checks, older .mjs probes) or a single script name
node scripts/probe-code-editor.cjs                                          # single probe
```

Guard scripts (run after touching colors, tokens or controls):

```bash
node scripts/check-hardcoded-colors.mjs   # no Tailwind palette classes / raw hex outside var(--x, #fallback)
node scripts/check-nativos.mjs            # no native <select>, <textarea>, input[type=date] outside their wrapper components
node scripts/check-icons.mjs              # no direct icon-library imports outside src/icons/lucide.ts
npx tsx scripts/check-tokens.mjs          # styles/tokens.css must match resolveTheme() output
npx tsx scripts/check-contrast.mts [preset-id]   # real WCAG contrast of story text; needs Ladle running
npm run shots -- .shots/base              # screenshot every story light+dark; then
node scripts/shots.mjs --diff .shots/base .shots/after
```

Browser scripts use `playwright-core` with system Chrome (`C:/Program Files/Google/Chrome/Application/chrome.exe`); override with `CHROME_PATH` and `LADLE_URL`. Restart Ladle after adding new story files. For cross-cutting visual changes, take a `shots` baseline before editing and diff afterwards.

New probes should use `scripts/probe-kit.cjs` (`run`, `storyUrl`, `createChecker`, `touch`/`flick`, `CHROME`/`BASE` from env); it works from `.cjs`, `.mjs` and `.mts`. `npm test` runs every `scripts/*.test.cjs`; `test-support.cjs` also exports `render()` (SSR markup) and `near()`.

Unit tests load TS sources directly (no build) via `scripts/test-support.cjs`, which registers a `ts.transpileModule` require hook — require `../src/...ts` paths from tests.

## Architecture

**Entry points** (`package.json` `exports`): `.` → `src/index.ts` (components, hooks, contexts, theme); `./charts` → `src/charts` (only place that imports `recharts`, an optional peer dep — never import it from the main entry); `./ai` → `src/ai` (provider-agnostic chat/AI UI, no SDK or network); `./qr` → `src/qr` (only place that imports `uqr`, optional peer dep; `matrix.ts` is pure path/SVG generation, readability checked with jsQR in `scripts/qr.test.cjs` and `scripts/probe-qr.cjs` — rerun both after touching module/eye shapes); plus raw CSS (`styles/*.css`) and `tailwind/preset.cjs`. New public modules must be re-exported from the relevant `index.ts`.

**Styling contract.** Components are Tailwind classes that reference CSS variables, compiled by the *consumer's* Tailwind JIT (the consumer scans `node_modules/@openfactu/ui/dist`). Therefore:
- Class names must be literal strings (use maps of full class strings, never `bg-${x}`).
- Every `var()` carries a fallback: `bg-[var(--bg-card,#ffffff)]`.
- Component-specific CSS that can't be utilities lives in `styles/*.css` (e.g. `code-editor.css`, `ai.css`) and is pulled in by `styles/index.css`.

**Token layers.** `--k-ink-*`, `--k-line*`, `--k-surface` are a *fixed palette* (same in light/dark). Components must target the *semantic layer* that responds to mode: `--bg-*`, `--fg-*` (`--fg-default`/`body`/`muted`/`subtle`), `--border-*`. Status colors: `--k-danger` for fills, `--k-danger-fg` for text.

**Theme engine** (`src/theme`). A theme is essentially two colors + mode (+ radius, typography); `derive.ts` computes hovers, contrasting foregrounds, dark surfaces and accent scale; `tokens.ts` `resolveTheme()` is pure and `themeToCssVars/themeToCssText` serialize it; `applyTheme.ts` writes vars onto `<html>` (or a subtree) and toggles `.dark`. `styles/tokens.css` is a hand-maintained copy of the default resolved theme — any change to `derive.ts`/`tokens.ts` defaults must be mirrored there (verify with `check-tokens`). `ThemeProvider` is optional: components never read theme context, only CSS variables.

**Material, density, motion, text scale.** The theme also carries `material` (blur/alpha/saturate/border/highlight), `backdrop`, `density`, `motion` and `typography.scale`, emitted as `--k-surface-*`, `--k-app-backdrop`, `--k-density`, `--k-motion`, `--k-ease`, `--k-text-scale` (defaults mirrored in `styles/tokens.css`). Glass only activates through `data-k-material`/`data-k-backdrop` (set by `applyTheme`, or `themeToAttrs` for subtrees) and `styles/material.css`; surfaces opt in with `data-k-surface` or a `dialog/menu/listbox` role. Density, motion and named font sizes work by `tailwind/preset.cjs` wrapping Tailwind's spacing/duration/fontSize scales in `calc(… * var(--k-…))`, so arbitrary values (`px-[10px]`) don't scale. `border.width`, `focus`, `selection` and `backdropMotion` follow the same opt-in pattern: tokens always emitted (defaults in `tokens.css`), behaviour only when the theme sets them (`data-k-focus`, `data-k-selection`, `data-k-backdrop-motion`). `src/theme/export.ts` serializes/imports themes; `stories/ThemeEditor.stories.tsx` is the live editor.

**Physical motion** (`src/motion`, no deps). `spring.ts` is the closed-form damped spring (`springAt`, `spring({bounce,duration})`, `springToLinear` → CSS `linear()` + settle duration, validated against RK4 in `scripts/motion.test.cjs`). Hybrid: open/close/indicators are pure CSS transitions on theme vars `--k-spring-<role>[-duration]` (roles `enter|exit|pop|move|gesture`, characters `sober|smooth|expressive|playful` in `presets.ts`, resolved in `theme/tokens.ts`, all with sober-like `var()` fallbacks and a `@supports not linear()` cubic fallback); JS rAF springs only for gestures (`useSpring`, `useDragDismiss` with velocity continuity, writing the `translate` property so it composes with `transform` classes). Pattern: component sets `data-state="open|closed"` and keeps itself mounted for the exit (`useAnimatedPresence`, `usePopover.mounted/popoverProps`); classes `k-appear`/`k-sheet`/`k-scrim`/`k-indicator`/`k-stagger` live in `styles/motion.css`. Changing characters/defaults means mirroring `styles/tokens.css` (`check-tokens`). Probe: `scripts/probe-motion.cjs`.

**Map** (`src/map`): `geo.ts` is pure Web Mercator maths (`project`, `visibleTiles`, `fitBounds`, `clusterPoints`; unit-tested in `scripts/map.test.cjs`, exported as the `mapGeo` namespace to avoid generic names). `Map.tsx` (`TileMap`) owns the view state, gestures (pointer/pinch/wheel/inertia) and tiles (two zoom levels stacked so loading gaps show the parent); `Layers.tsx` has `Marker`, `MapPopup`, `MarkerCluster`, `MapPath`, `MapCircle` positioned through `useMap().toScreen`. Map styles are a registry (`styles.ts`, `registerMapStyle`; built-ins are OSM + CSS filters so none needs an API key), geocoders are plain functions (`geocode.ts`), and `MapControl` portals into the four corner containers the map exposes through context (their callback refs must stay stable or React loops). Styles in `styles/map.css`. Never hardcode a tile provider's key in the library: `tileUrl` is a prop.

**Controls and panels.** Slider, Rating, OtpInput, ToggleGroup, InlineEdit, ChoiceCards, SignaturePad, SplitPane, ScrollArea, VirtualList, TreeView and BottomSheet keep their maths in pure helpers under `src/components/internal/{slider,otp,split,snap,tree,virtual}.ts` (tested in `scripts/controls.test.cjs`, which also checks their server markup/ARIA), and share label/description wiring through `internal/ControlField.tsx`. Styles live in `styles/controls.css` and `styles/layout.css`. Browser probe: `scripts/probe-controls.cjs`. `BottomSheet` is the single mobile sheet: `Modal` delegates to it when narrow and its presentation is `sheet` (so every `adaptivePortal`/`MobileOverlay` menu, select and date picker gets it), and `Drawer` does too with `mobilePresentation="sheet"`; in that branch Modal/Drawer skip their own scroll lock, focus trap and Escape (the sheet owns them). Probe: `scripts/probe-mobile-sheets.cjs`.

**Shared internals (reuse before writing a new helper).** `src/internal/`: `text.ts` (`fold` accent-insensitive compare, `matchesAllWords`, `foldedRange` for highlighting, `escapeRegExp`), `intl.ts` (`DEFAULT_LOCALE`, cached `getNumberFormat`/`formatNumber`), `format.ts` (`formatBytes`, `formatTimeOfDay`, `formatClock`), `files.ts` (`matchesAccept`), `url.ts` (`safeUrl` link/media/attachment), `storage.ts` (`safeStorage`, `useRecentSearches`), `roving.ts` (`rovingNext` arrow-key groups), `pointerDrag.ts` (`startPointerDrag`, `isPrimaryPointer`), `escapeStack.ts` (Escape closes only the top layer — popovers and menus use it too). `src/hooks/`: `useResizeObserver`/`useElementSize`, `useMergedRefs`, `useCopyToClipboard`/`copyText`, `useObjectUrl`, `useAutosize`, `useIsMobile` (`MOBILE_MAX = 768`, the same cut as `styles/mobile.css`). `motion/dom.ts`: `afterNextPaint` (cancellable double rAF) and `exitDelay`. Labelled controls render through `components/internal/ControlField.tsx` (+ `describedBy`). Anything shared by `src/ai` and `src/chat` must live in `src/internal`/`src/hooks`, never in `src/ai` (the main entry must not import `./ai`). «No motion» is one rule in `styles/motion.css` (`--k-motion: 0` under reduced motion or `data-motion="off"`): every duration must multiply by `--k-motion`.

**Dates, gallery, guides, showcase.** Calendar maths for `DateRangePicker`, `HeatmapCalendar` and `Countdown` is pure in `components/internal/calendar.ts` (ISO strings compared as text, days added at local noon so DST never skips a day); `TimePicker` exports `parseTime`. Their styles are in `styles/extras.css`. Story images come from `stories/shared/demoImages.ts` (generated SVG, no network). Probe: `scripts/probe-extras.cjs`.

**Icons.** The library is icon-library agnostic. Components never import an icon library: the UI renders `<UiIcon slot="chevron-down" />` (`ICON_SLOTS`, internal roles) and users write `<Icon name="…" />` with the names of THEIR library (`FiHome`, `HouseIcon`, `mdi:home`). An `IconLibrary` is `{ resolve(name), slots }`; `slots` says what fills each UI role. Lookup order: nearest `IconProvider` → registered libraries (`registerIconLibrary`, last wins) → Lucide (`src/icons/lucide.ts`, the only file allowed to import `lucide-react`; enforced by `scripts/check-icons.mjs`; it bundles only the icons the UI uses). Factories: `iconLibraryFromModule` (auto-detects naming + fills slots via `ICON_ALIASES`), `iconLibraryFromIcons`, `iconLibraryFromResolver`. Adding a UI icon = add the slot to `slots.ts`, its aliases to `aliases.ts` and its Lucide filler to `lucide.ts`.

**Registries over constants.** Catalogs are open for plugins: `registry.ts` (`registerThemePreset`, `registerTokens`, `unregisterThemeSource`, validated on register) and `useThemePresets` for reactive reads. `CodeEditor` likewise accepts custom languages (`CodeLanguageDefinition`) and themes. When adding a catalog, make it a registry, not a closed constant.

**Charts palette** (`src/charts/palette.ts`): slot order was chosen by a palette validator (incl. color-blind separation, light and dark); don't reorder by eye. Series colors are assigned in order without cycling; semantic roles (`positive`, `negative`, `warning`, `neutral`) are reserved.

**CodeEditor** (`src/components/CodeEditor.tsx` + `src/components/code-editor/`): native `textarea` overlaid on own lexical highlighting, no third-party engine. Pure editing logic (`editing.ts`), tokenizers (`languages.ts`), themes (`themes.ts`), virtualized rendering of visible lines (`CodeHighlight.tsx`), optional animated caret/selection (`CodeMotion.tsx`). Keep editing logic pure so it stays unit-testable.

**Overlays/infra**: shared hooks in `src/hooks` (`usePopover`, `useFocusTrap`, `useScrollLock`, `useAnimatedPresence`), Escape handling via `src/internal/escapeStack.ts`, global providers in `src/context` (Toast, Popup, Theme). `.ladle/components.tsx` wraps every story in `MemoryRouter` + `ToastProvider` + `PopupProvider` and toggles `.dark`.

## Conventions

- One Ladle story file per component in `stories/` (root, not next to components).
- Library components wrap native controls; elsewhere use `Select`/`SearchableSelect`, `Textarea`, `DatePicker` (enforced by `check-nativos`).
- No hardcoded Tailwind palette colors or hex outside a `var()` fallback (enforced by `check-hardcoded-colors`).
- Contrast target is WCAG AA (4.5:1 text, 3:1 large); theme registration warns on failures.
