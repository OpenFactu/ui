# AGENTS.md

This file provides guidance to Codex (claude.ai/code) when working with code in this repository.

## What this is

`@openfactu/ui` — React 19 component library for the Keirost design system, consumed mainly by `D:\dev\platform`. Docs, comments, story names and UI copy are in **Spanish**; keep new ones in Spanish.

## Commands

```bash
npm run dev          # Ladle playground at http://localhost:61000 (stories/**/*.stories.tsx)
npm run build        # tsc -> dist/ (only src/, stories excluded)
npm run typecheck    # tsc over src + stories + .ladle
npm test             # node:test unit tests: scripts/code-editor.test.cjs, scripts/ai.test.cjs
node --test --test-name-pattern="indentation" scripts/code-editor.test.cjs   # single test
npm run test:browser # Playwright probes (scripts/probe-*.cjs); needs Ladle running + Chrome
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

Unit tests load TS sources directly (no build) via `scripts/test-support.cjs`, which registers a `ts.transpileModule` require hook — require `../src/...ts` paths from tests.

## Architecture

**Entry points** (`package.json` `exports`): `.` → `src/index.ts` (components, hooks, contexts, theme); `./charts` → `src/charts` (only place that imports `recharts`, an optional peer dep — never import it from the main entry); `./ai` → `src/ai` (provider-agnostic chat/AI UI, no SDK or network); plus raw CSS (`styles/*.css`) and `tailwind/preset.cjs`. New public modules must be re-exported from the relevant `index.ts`.

**Styling contract.** Components are Tailwind classes that reference CSS variables, compiled by the *consumer's* Tailwind JIT (the consumer scans `node_modules/@openfactu/ui/dist`). Therefore:
- Class names must be literal strings (use maps of full class strings, never `bg-${x}`).
- Every `var()` carries a fallback: `bg-[var(--bg-card,#ffffff)]`.
- Component-specific CSS that can't be utilities lives in `styles/*.css` (e.g. `code-editor.css`, `ai.css`) and is pulled in by `styles/index.css`.

**Token layers.** `--k-ink-*`, `--k-line*`, `--k-surface` are a *fixed palette* (same in light/dark). Components must target the *semantic layer* that responds to mode: `--bg-*`, `--fg-*` (`--fg-default`/`body`/`muted`/`subtle`), `--border-*`. Status colors: `--k-danger` for fills, `--k-danger-fg` for text.

**Theme engine** (`src/theme`). A theme is essentially two colors + mode (+ radius, typography); `derive.ts` computes hovers, contrasting foregrounds, dark surfaces and accent scale; `tokens.ts` `resolveTheme()` is pure and `themeToCssVars/themeToCssText` serialize it; `applyTheme.ts` writes vars onto `<html>` (or a subtree) and toggles `.dark`. `styles/tokens.css` is a hand-maintained copy of the default resolved theme — any change to `derive.ts`/`tokens.ts` defaults must be mirrored there (verify with `check-tokens`). `ThemeProvider` is optional: components never read theme context, only CSS variables.

**Material, density, motion, text scale.** The theme also carries `material` (blur/alpha/saturate/border/highlight), `backdrop`, `density`, `motion` and `typography.scale`, emitted as `--k-surface-*`, `--k-app-backdrop`, `--k-density`, `--k-motion`, `--k-ease`, `--k-text-scale` (defaults mirrored in `styles/tokens.css`). Glass only activates through `data-k-material`/`data-k-backdrop` (set by `applyTheme`, or `themeToAttrs` for subtrees) and `styles/material.css`; surfaces opt in with `data-k-surface` or a `dialog/menu/listbox` role. Density, motion and named font sizes work by `tailwind/preset.cjs` wrapping Tailwind's spacing/duration/fontSize scales in `calc(… * var(--k-…))`, so arbitrary values (`px-[10px]`) don't scale. `border.width`, `focus`, `selection` and `backdropMotion` follow the same opt-in pattern: tokens always emitted (defaults in `tokens.css`), behaviour only when the theme sets them (`data-k-focus`, `data-k-selection`, `data-k-backdrop-motion`). `src/theme/export.ts` serializes/imports themes; `stories/ThemeEditor.stories.tsx` is the live editor.

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
