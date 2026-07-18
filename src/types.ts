/**
 * Public API contract for useServerTable.
 *
 * Design rules (keep these when implementing):
 * - Zero UI, zero fetching. The hook owns state + derivations only.
 * - Any state change that alters the result set (search, sort, filters, limit)
 *   MUST reset offset to 0. This is the "empty page 4" bug killer.
 * - All state is serializable → URL sync is a projection, never a second source of truth.
 */

export type SortDirection = 'asc' | 'desc';

export type SortState = {
  /** Column / field id the server understands, e.g. 'createdAt' */
  id: string;
  direction: SortDirection;
};

export type ServerTableState = {
  /** Zero-based row offset sent to the server */
  offset: number;
  /** Page size */
  limit: number;
  /** Debounced, committed search value (what queries should use) */
  search: string;
  /** Raw input value (what the <input> should render) — updates immediately */
  searchInput: string;
  /** Active sort, or null for server default ordering */
  sort: SortState | null;
};

export type UseServerTableOptions = {
  defaultLimit?: number;
  defaultSort?: SortState | null;
  defaultSearch?: string;
  defaultOffset?: number;
  /** Debounce for committing searchInput → search. Default: 300 */
  searchDebounceMs?: number;
  /**
   * Sync state to URL search params (?offset=20&limit=10&q=foo&sort=-createdAt).
   * Implemented via history.replaceState — no router dependency.
   * Default: false
   */
  syncToUrl?: boolean;
  /** Prefix for URL params to avoid collisions when two tables share a page */
  urlParamPrefix?: string;
  /** Called whenever committed state changes — an escape hatch for imperative fetchers */
  onStateChange?: (state: ServerTableState) => void;
};

export interface Total {
  type: 'pages' | 'items';
  value: number;
}

export type UseServerTableReturn = {
  // -- state --------------------------------------------------------------
  offset: number;
  limit: number;
  search: string;
  searchInput: string;
  sort: SortState | null;

  // -- derived ------------------------------------------------------------
  /** Current page, zero-based: floor(offset / limit) */
  pageIndex: number;
  /** Derived from the total you report via setTotal. 0 until known. */
  pageCount: number;
  totalItems: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  /**
   * Stable, serializable snapshot for cache keys:
   *   useQuery({ queryKey: ['users', table.queryKey], ... })
   */
  queryKey: ServerTableState;
  /**
   * Ready-to-send params: { offset, limit, search?, sortBy?, sortDir? }.
   * Spread into your fetcher.
   */
  queryParams: {
    offset: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortDir?: SortDirection;
  };

  // -- actions ------------------------------------------------------------
  /** Immediate: updates searchInput. Debounced: commits to search + resets offset. */
  setSearch: (value: string) => void;
  /** Cycle asc → desc → none for a column, or set explicitly. Resets offset. */
  toggleSort: (id: string) => void;
  setSort: (sort: SortState | null) => void;
  setOffset: (offset: number) => void;
  setLimit: (limit: number) => void;
  /** Clamped to [0, pageCount) once total is known */
  setPageIndex: (pageIndex: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  /** Report the server's total row count; derives pageCount and clamps offset */
  setTotal: (params: Total) => void;
  /** Reset search/sort/pagination back to defaults */
  reset: () => void;
};
