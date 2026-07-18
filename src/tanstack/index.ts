import type { PaginationState, SortingState, TableOptions } from '@tanstack/react-table';
import type { UseServerTableReturn } from '../types';

/**
 * Adapter: project useServerTable state into TanStack Table's manual-mode options.
 *
 * Usage:
 *   const table = useServerTable();
 *   const rt = useReactTable({ data, columns, ...toTanstackOptions(table) });
 *
 * TODO(kostas): implement. It should return:
 * - manualPagination: true, manualSorting: true, manualFiltering: true
 * - state: { pagination: { pageIndex, pageSize }, sorting }
 * - pageCount from table.pageCount
 * - onPaginationChange / onSortingChange handlers that unwrap TanStack's
 *   Updater<T> (value or function) and forward into the hook's actions
 * - autoResetPageIndex: false (the hook owns resets — see types.ts design rules)
 */
export function toTanstackOptions<TData>(
  _table: UseServerTableReturn,
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
  throw new Error('toTanstackOptions: not implemented yet');
}
