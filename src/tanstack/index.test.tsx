import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useServerTable } from '../useServerTable';
import { toTanstackOptions } from './index';

describe('toTanstackOptions', () => {
  it('sets manual mode and disables auto page reset', () => {
    const { result } = renderHook(() => useServerTable());
    const opts = toTanstackOptions(result.current);

    expect(opts.manualPagination).toBe(true);
    expect(opts.manualSorting).toBe(true);
    expect(opts.manualFiltering).toBe(true);
    expect(opts.autoResetPageIndex).toBe(false);
  });

  it('maps state: 1-based pageIndex → 0-based, sort → SortingState', () => {
    const { result } = renderHook(() => useServerTable());
    act(() => {
      result.current.setTotal({ type: 'pages', value: 5 });
      result.current.setSort({ id: 'name', direction: 'desc' });
      result.current.setPageIndex(3); // 1-based; set last (sort resets offset)
    });

    const opts = toTanstackOptions(result.current);
    expect(opts.pageCount).toBe(5);
    expect(opts.state.pagination).toEqual({ pageIndex: 2, pageSize: 20 });
    expect(opts.state.sorting).toEqual([{ id: 'name', desc: true }]);
  });

  it('empty sort maps to an empty SortingState', () => {
    const { result } = renderHook(() => useServerTable());
    expect(toTanstackOptions(result.current).state.sorting).toEqual([]);
  });

  it('onPaginationChange (value updater) moves the page', () => {
    const { result } = renderHook(() => useServerTable());
    act(() => result.current.setTotal({ type: 'pages', value: 5 }));

    act(() =>
      toTanstackOptions(result.current).onPaginationChange?.({
        pageIndex: 2, // 0-based → hook page 3
        pageSize: 20,
      }),
    );
    expect(result.current.pageIndex).toBe(3);
    expect(result.current.offset).toBe(40);
  });

  it('onPaginationChange (function updater) is unwrapped against current state', () => {
    const { result } = renderHook(() => useServerTable());
    act(() => result.current.setTotal({ type: 'pages', value: 5 }));

    act(() =>
      toTanstackOptions(result.current).onPaginationChange?.((prev) => ({
        ...prev,
        pageIndex: prev.pageIndex + 1, // next page
      })),
    );
    expect(result.current.pageIndex).toBe(2);
  });

  it('a page-size change routes to setLimit and resets offset', () => {
    const { result } = renderHook(() => useServerTable());
    act(() => {
      result.current.setTotal({ type: 'pages', value: 5 });
      result.current.setPageIndex(4);
    });
    expect(result.current.offset).toBe(60);

    act(() =>
      toTanstackOptions(result.current).onPaginationChange?.({
        pageIndex: 3,
        pageSize: 50, // size changed
      }),
    );
    expect(result.current.limit).toBe(50);
    expect(result.current.offset).toBe(0); // setLimit reset
  });

  it('onSortingChange forwards sort, and clears to null when emptied', () => {
    const { result } = renderHook(() => useServerTable());

    act(() => toTanstackOptions(result.current).onSortingChange?.([{ id: 'age', desc: false }]));
    expect(result.current.sort).toEqual({ id: 'age', direction: 'asc' });

    act(() => toTanstackOptions(result.current).onSortingChange?.([]));
    expect(result.current.sort).toBeNull();
  });
});
