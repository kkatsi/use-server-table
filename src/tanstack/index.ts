import type { PaginationState, SortingState, TableOptions, Updater } from '@tanstack/react-table';
import type { UseServerTableReturn } from '../types';

const applyUpdater = <T>(updater: Updater<T>, prev: T): T =>
  typeof updater === 'function' ? (updater as (old: T) => T)(prev) : updater;

/**
 * Adapter: project useServerTable state into TanStack Table's manual-mode options.
 *
 * Usage:
 *   const table = useServerTable();
 *   const rt = useReactTable({ data, columns, ...toTanstackOptions(table) });
 *
 * Manual mode + autoResetPageIndex: false — the hook owns all resets.
 */
export function toTanstackOptions<TData>(
  table: UseServerTableReturn,
): Pick<
  TableOptions<TData>,
  | 'manualPagination'
  | 'manualSorting'
  | 'manualFiltering'
  | 'pageCount'
  | 'onPaginationChange'
  | 'onSortingChange'
  | 'autoResetPageIndex'
> & { state: { pagination: PaginationState; sorting: SortingState } } {
  // TanStack pageIndex is 0-based; the hook's is 1-based.
  const pagination: PaginationState = {
    pageIndex: table.pageIndex - 1,
    pageSize: table.limit,
  };
  const sorting: SortingState = table.sort
    ? [{ id: table.sort.id, desc: table.sort.direction === 'desc' }]
    : [];

  return {
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    autoResetPageIndex: false,
    pageCount: table.pageCount,
    state: { pagination, sorting },
    onPaginationChange: (updater) => {
      const next = applyUpdater(updater, pagination);
      // A page-size change owns the offset reset (setLimit → offset 0);
      // otherwise it's a page move.
      if (next.pageSize !== pagination.pageSize) table.setLimit(next.pageSize);
      else table.setPageIndex(next.pageIndex + 1);
    },
    onSortingChange: (updater) => {
      const [next] = applyUpdater(updater, sorting);
      table.setSort(next ? { id: next.id, direction: next.desc ? 'desc' : 'asc' } : null);
    },
  };
}
