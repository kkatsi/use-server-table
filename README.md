# use-server-table

> Headless React hook for server-side table state — pagination, sorting, debounced search, and URL sync. Zero UI. Zero framework. Optional TanStack Table adapter.

**Status: work in progress — not yet published.**

Every admin panel rebuilds the same glue: hold offset/limit/search/sort, debounce the search input, reset to page 0 when the result set changes, build the query params, sync it all to the URL. And every hand-rolled version ships at least one of these bugs:

- searching leaves the user on page 4 of an empty result set
- un-debounced search races the server and renders stale responses
- back-button loses the table state
- total count arrives and the current page no longer exists
- `autoResetPageIndex` fires when you didn't want it to ("Maximum update depth exceeded", anyone?)

`use-server-table` is that glue, written once, tested, and headless — it renders nothing and fetches nothing, so it works with any UI (styled-components, Tailwind, shadcn) and any fetcher (TanStack Query, SWR, plain fetch).

## Usage

```tsx
import { useServerTable } from 'use-server-table';

const table = useServerTable({ defaultLimit: 10, syncToUrl: true });

const { data, isLoading } = useQuery({
  queryKey: ['users', table.queryKey],
  queryFn: () => api.getUsers(table.queryParams),
  placeholderData: keepPreviousData,
});

useEffect(() => {
  if (data) table.setTotal({ type: 'items', value: data.total });
}, [data]);
```

With TanStack Table:

```tsx
import { toTanstackOptions } from 'use-server-table/tanstack';

const rt = useReactTable({ data: data?.rows ?? [], columns, ...toTanstackOptions(table) });
```

## Positioning

Like refine's `useTable`, without refine. Like nuqs, but table-aware. Like the shadcn data-table templates, but a dependency you update instead of code you pasted.

## Development

```bash
npm install
npm run type-check   # tsc --noEmit
npm run check        # biome lint + format
npm run test         # vitest
npm run build        # type-check + vite lib build → dist/
```

The behavior contract lives in `src/useServerTable.test.tsx` — each spec is a production bug this hook kills.

## License

MIT © Kostas Katsinaris
