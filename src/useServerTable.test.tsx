import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useServerTable } from './useServerTable';

const SEARCH_TEST_STRING = 'my test search';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState({}, '', '/');
});

describe('useServerTable', () => {
  it('exports a hook', () => {
    expect(typeof useServerTable).toBe('function');
  });

  // The behavior contract — implement these as you go. Each one is a bug
  // someone has shipped to production.
  it('returns defaults: offset 0, limit 20, empty search, null sort', () => {
    const { result } = renderHook(() => useServerTable());

    expect(result.current.offset).toBe(0);
    expect(result.current.limit).toBe(20);
    expect(result.current.search).toBe('');
    expect(result.current.sort).toBeNull();
  });
  it('setSearch updates searchInput immediately but debounces the committed search', () => {
    const { result } = renderHook(() => useServerTable());

    act(() => {
      result.current.setSearch(SEARCH_TEST_STRING);
    });
    expect(result.current.searchInput).toBe(SEARCH_TEST_STRING);
    expect(result.current.search).toBe('');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.search).toBe(SEARCH_TEST_STRING);
  });
  it('committing a search resets offset to 0 (the empty-page-4 bug)', async () => {
    const { result } = renderHook(() => useServerTable());
    act(() => {
      result.current.setTotal({ type: 'pages', value: 5 });
      result.current.setPageIndex(4);
    });
    expect(result.current.offset).toBe(result.current.limit * 3);
    act(() => {
      result.current.setSearch(SEARCH_TEST_STRING);
      vi.advanceTimersByTime(500);
    });
    expect(result.current.offset).toBe(0);
  });
  it('changing limit resets offset to 0', () => {
    const { result } = renderHook(() => useServerTable());

    act(() => {
      result.current.setTotal({ type: 'pages', value: 2 });
      result.current.setOffset(20);
    });
    expect(result.current.offset).toBe(20);
    act(() => {
      result.current.setLimit(30);
    });
    expect(result.current.limit).toBe(30);
    expect(result.current.offset).toBe(0);
  });
  it('toggleSort cycles asc → desc → none and resets offset', () => {
    const { result } = renderHook(() => useServerTable());

    act(() => {
      result.current.setTotal({ type: 'pages', value: 10 });
      result.current.setOffset(40);
    });
    expect(result.current.offset).toBe(40);

    act(() => {
      result.current.toggleSort('age');
    });
    expect(result.current.sort).toEqual({ id: 'age', direction: 'asc' });
    expect(result.current.offset).toBe(0);

    act(() => {
      result.current.toggleSort('age');
    });
    expect(result.current.sort).toEqual({ id: 'age', direction: 'desc' });

    act(() => {
      result.current.toggleSort('age');
    });
    expect(result.current.sort).toBeNull();
  });
  it('setTotal derives pageCount and canNextPage/canPreviousPage', () => {
    const { result } = renderHook(() => useServerTable());

    act(() => {
      result.current.setTotal({ type: 'pages', value: 5 });
    });
    expect(result.current.pageCount).toBe(5);

    expect(result.current.canNextPage).toBeTruthy();
    expect(result.current.canPreviousPage).toBeFalsy();

    act(() => {
      result.current.setOffset(80);
    });

    expect(result.current.offset).toBe(80);
    expect(result.current.canPreviousPage).toBeTruthy();
    expect(result.current.canNextPage).toBeFalsy();
  });
  it('setTotal clamps offset when the result set shrinks below the current page', () => {
    const { result } = renderHook(() => useServerTable());

    act(() => {
      result.current.setTotal({ type: 'pages', value: 5 });
      result.current.setOffset(80);
      result.current.setTotal({ type: 'pages', value: 2 });
    });
    expect(result.current.offset).toBe(20);
  });
  it('setPageIndex clamps to [0, pageCount)', () => {
    const { result } = renderHook(() => useServerTable());

    act(() => {
      result.current.setTotal({ type: 'pages', value: 5 });
    });

    act(() => {
      result.current.setPageIndex(-1);
    });
    expect(result.current.pageIndex).toBe(1);

    act(() => {
      result.current.setPageIndex(6);
    });

    expect(result.current.pageIndex).toBe(5);
  });
  it('queryKey is referentially stable while committed state is unchanged', () => {
    const { result, rerender } = renderHook(() => useServerTable());

    const first = result.current.queryKey;

    rerender();
    expect(result.current.queryKey).toBe(first);

    act(() => {
      result.current.setTotal({ type: 'pages', value: 5 });
    });
    expect(result.current.queryKey).toBe(first);

    act(() => {
      result.current.setSort({ id: 'name', direction: 'asc' });
    });
    expect(result.current.queryKey).not.toBe(first);
  });
  it('queryParams omits search/sort keys when empty', () => {
    window.history.replaceState({}, '', '?limit=50&offset=20');
    const { result } = renderHook(() => useServerTable());

    expect(result.current.queryParams).toEqual({ limit: 50, offset: 20 });
  });
  it('syncToUrl reads initial state from location.search on mount', () => {
    window.history.replaceState({}, '', '?limit=50&offset=20');
    const { result } = renderHook(() => useServerTable({ syncToUrl: true }));
    expect(result.current.limit).toBe(50);
    expect(result.current.offset).toBe(20);
  });
  it('syncToUrl writes committed changes via replaceState, not transient input', () => {
    const spy = vi.spyOn(window.history, 'replaceState');
    const { result } = renderHook(() => useServerTable({ syncToUrl: true }));

    act(() => result.current.setSearch('foo'));
    expect(spy).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(350));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(window.location.search).toContain('search=foo');

    spy.mockRestore();
  });
  it('urlParamPrefix namespaces params so two tables can share a page', () => {
    const { result: firstResult } = renderHook(() =>
      useServerTable({ syncToUrl: true, urlParamPrefix: 'first_' }),
    );
    const { result: secondResult } = renderHook(() =>
      useServerTable({ syncToUrl: true, urlParamPrefix: 'second_' }),
    );

    act(() => {
      firstResult.current.setLimit(40);
      secondResult.current.setLimit(50);
    });

    expect(window.location.search).toContain('first_limit=40');
    expect(window.location.search).toContain('second_limit=50');
  });
  it('reset returns state to defaults', () => {
    const { result } = renderHook(() => useServerTable());

    act(() => {
      result.current.setLimit(50);
    });
    expect(result.current.limit).toBe(50);

    act(() => {
      result.current.reset();
    });
    expect(result.current.limit).toBe(20);
  });
  it.todo('unmount cancels the pending search debounce');
});
