import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useServerTable } from './useServerTable';

const SEARCH_TEST_STRING = 'my test search';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

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
  it.todo('toggleSort cycles asc → desc → none and resets offset', () => {
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
  it.todo(
    'setTotal clamps offset when the result set shrinks below the current page',
  );
  it.todo('setPageIndex clamps to [0, pageCount)');
  it.todo(
    'queryKey is referentially stable while committed state is unchanged',
  );
  it.todo('queryParams omits search/sort keys when empty');
  it.todo('syncToUrl reads initial state from location.search on mount');
  it.todo(
    'syncToUrl writes committed changes via replaceState, not transient input',
  );
  it.todo('urlParamPrefix namespaces params so two tables can share a page');
  it.todo('reset returns state to defaults');
  it.todo('unmount cancels the pending search debounce');
});
