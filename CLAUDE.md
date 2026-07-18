# use-server-table

Headless React hook for server-side table state — pagination, sorting, debounced search, URL sync. **Zero UI, zero fetching, zero framework.** Optional TanStack Table adapter as a separate entry point. Personal OSS package by Kostas, published to npm as `use-server-table` (name reserved, not yet published).

## What this package is (and is not)

It packages the glue every admin panel rebuilds: hold offset/limit/search/sort, debounce search input, reset pagination when the result set changes, expose ready-to-use query params, optionally mirror state to the URL. It renders nothing and fetches nothing — consumers bring their own UI (any styling) and fetcher (TanStack Query, SWR, plain fetch).

Positioning: "refine's `useTable`, without refine. nuqs, but table-aware. shadcn data-table templates, but a dependency instead of pasted code."

**Scope discipline is a hard rule.** Pagination + sort + search + URL sync only. No filters DSL, no column visibility, no row selection, no data processing. The moment we add those we're rebuilding TanStack Table. Push back if asked to expand scope.

## Source of truth

- `src/types.ts` — the public API contract, with design rules in comments. Types were written first; implementation must conform to them, not vice versa. Changing the contract is allowed pre-1.0 but is a deliberate decision, not a convenience.
- `src/useServerTable.test.tsx` — the behavior contract as `it.todo` specs. Each todo is a real production bug this hook exists to kill. Implementing = converting todos to passing tests. Don't delete or weaken them.

## Non-negotiable behavior rules

1. **Offset reset**: any state change that alters the result set (search commit, sort change, limit change) MUST reset offset to 0. This is the "empty page 4" bug — the package's raison d'être.
2. **Two-phase search**: `searchInput` updates immediately (what the input renders); `search` is the debounced, committed value (what queries use). Debounce default 300ms, cancelled on unmount.
3. **Clamping**: when `setTotal` reports a shrunken result set, clamp offset into range. `setPageIndex` clamps to `[0, pageCount)`.
4. **Referential stability**: `queryKey` / `queryParams` must be memoized per committed state — they feed TanStack Query cache keys and effect deps.
5. **URL sync is a projection, never a second source of truth.** Read `location.search` once on mount; write committed changes (never transient `searchInput`) via `history.replaceState`. Throttle writes (Safari rate-limits replaceState). Batch one URL write per commit, not per setter.

## Architecture decisions (already made — don't relitigate casually)

- **No nuqs dependency.** Core stays zero-dep; nuqs v2 requires an app-level adapter provider, which breaks the "zero framework" pitch. URL sync is DIY (~50 lines) behind a small pluggable adapter interface (`syncToUrl: true` = built-in adapter; `syncToUrl: { adapter }` = escape hatch, enabling a future nuqs bridge).
- **TanStack Table is an optional peer dep**, consumed only by the `use-server-table/tanstack` entry (`toTanstackOptions`). Core must never import it. The adapter sets `manualPagination/manualSorting/manualFiltering: true` and `autoResetPageIndex: false` — the hook owns resets.
- **React `>=18` peer range; develop/test against 18.** Don't use React-19-only APIs. No `use()`, no actions.
- **Internal state via `useReducer`** with a single reducer so the offset-reset rule lives in one place — reducer cases for search/sort/limit return state with `offset: 0` rather than relying on callers to remember.

## Repo layout

```
src/index.ts              # public exports (core)
src/types.ts              # API contract — read this first
src/useServerTable.ts     # the hook (implementation in progress by Kostas)
src/tanstack/index.ts     # toTanstackOptions adapter (separate build entry)
src/useServerTable.test.tsx  # behavior contract (it.todo specs)
```

Build: Vite lib mode, dual ESM/CJS, two entries (`.` and `./tanstack`), `vite-plugin-dts` for types. Peer deps external — never bundled.

## Validation

```bash
npm run type-check   # tsc --noEmit (strict; exactOptionalPropertyTypes is ON)
npm run check        # biome lint + format
npm run test         # vitest (jsdom)
npm run build        # type-check + vite build → dist/
```

Minimum gate before any commit: `npm run type-check && npm run check && npm run test`. Biome is the only linter/formatter (no ESLint/Prettier). `@/*` aliases `./src/*`.

## Working style

Kostas implements; Claude answers questions, reviews, and pairs on tricky parts (debounce cleanup, URL adapter, TanStack `Updater` unwrapping, clamping edge cases). Don't rewrite whole files unasked. When reviewing, check against the behavior rules above and the test contract. Honest pushback welcome — especially on API-surface growth.
