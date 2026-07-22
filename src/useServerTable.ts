import { useEffect, useMemo, useReducer, useRef } from 'react';
import { DEFAULT_SEARCH_TIMEOUT_MS } from './constants';
import type {
  ServerTableState,
  SortDirection,
  SortState,
  Total,
  UseServerTableOptions,
  UseServerTableReturn,
} from './types';

/**
 * Headless server-side table state.
 *
 * TODO(kostas): implement. Suggested internal shape:
 * - useReducer with a single ServerTableState + totalItems
 * - every result-set-changing action ({ type: 'search' | 'sort' | 'limit' }) resets offset to 0
 * - debounce searchInput → search commit (searchDebounceMs), cancel on unmount
 * - clamp offset when setTotal reports fewer pages than current offset implies
 * - syncToUrl: read initial state from location.search on mount,
 *   history.replaceState on committed changes (skip transient searchInput)
 * - memoize queryKey/queryParams so they're referentially stable per committed state
 */

type ReducerAction =
  | { type: 'search'; value: string }
  | { type: 'searchInput'; value: string }
  | { type: 'sort'; sort: SortState | null }
  | { type: 'limit'; value: number }
  | { type: 'offset'; value: number }
  | { type: 'total'; value: Total }
  | { type: 'reset'; state: ServerTableState & { total: Total } };

const clampOffset = (offset: number, limit: number, total: Total) => {
  const items = total.type === 'items' ? total.value : limit * total.value;
  const maxOffset = Math.max(0, Math.ceil(items / limit) - 1) * limit;
  return Math.min(Math.max(0, offset), maxOffset);
};

const reducer = (
  state: ServerTableState & { total: Total },
  action: ReducerAction,
): ServerTableState & { total: Total } => {
  switch (action.type) {
    case 'offset':
      return {
        ...state,
        offset: clampOffset(action.value, state.limit, state.total),
      };
    case 'limit':
      return { ...state, limit: action.value, offset: 0 };
    case 'search':
      return { ...state, search: action.value, offset: 0 };
    case 'searchInput':
      return { ...state, searchInput: action.value };
    case 'sort':
      return { ...state, sort: action.sort, offset: 0 };
    case 'total':
      return {
        ...state,
        total: action.value,
        offset: clampOffset(state.offset, state.limit, action.value),
      };
    case 'reset':
      return action.state;
  }
};

const parseParams = (
  params: URLSearchParams,
  qsParamNames: Record<'limit' | 'offset' | 'search' | 'sortBy' | 'sortDir', string>,
  defaultInitialState: ServerTableState,
) => {
  const limit = params.get(qsParamNames.limit);
  const offset = params.get(qsParamNames.offset);
  const search = params.get(qsParamNames.search);
  const sortBy = params.get(qsParamNames.sortBy);
  const sortDir = params.get(qsParamNames.sortDir);
  return {
    limit: typeof limit !== 'string' ? defaultInitialState.limit : Number.parseInt(limit, 10),
    offset: typeof offset !== 'string' ? defaultInitialState.offset : Number.parseInt(offset, 10),
    ...((typeof search === 'string' || !!defaultInitialState.search) && {
      search: search || defaultInitialState.search,
    }),
    ...(typeof sortBy === 'string'
      ? { sortBy }
      : defaultInitialState.sort?.id && {
          sortBy: defaultInitialState.sort.id,
        }),
    ...(typeof sortDir === 'string'
      ? { sortDir: sortDir as SortDirection }
      : defaultInitialState.sort?.direction && {
          sortDir: defaultInitialState.sort?.direction as SortDirection,
        }),
  } satisfies UseServerTableReturn['queryParams'];
};

const getNextState = (currentState: SortDirection | null) => {
  switch (currentState) {
    case 'asc':
      return 'desc';
    case 'desc':
      return null;
    default:
      return 'asc';
  }
};

export function useServerTable(_options: UseServerTableOptions = {}): UseServerTableReturn {
  const qsParamNames = {
    limit: _options.urlParamPrefix ? `${_options.urlParamPrefix}limit` : 'limit',
    offset: _options.urlParamPrefix ? `${_options.urlParamPrefix}offset` : 'offset',
    search: _options.urlParamPrefix ? `${_options.urlParamPrefix}search` : 'search',
    sortBy: _options.urlParamPrefix ? `${_options.urlParamPrefix}sortBy` : 'sortBy',
    sortDir: _options.urlParamPrefix ? `${_options.urlParamPrefix}sortDir` : 'sortDir',
  };
  const defaultInitialState = {
    limit: _options.defaultLimit ?? 20,
    offset: _options.defaultOffset ?? 0,
    search: _options.defaultSearch ?? '',
    searchInput: _options.defaultSearch ?? '',
    sort: _options.defaultSort ?? null,
  } satisfies ServerTableState;

  const urlSearchParams = new URLSearchParams(location.search);
  const initialQsParams = parseParams(urlSearchParams, qsParamNames, defaultInitialState);

  const qsParamsInitialState = {
    limit: initialQsParams.limit,
    offset: initialQsParams.offset,
    search: initialQsParams.search ?? '',
    searchInput: initialQsParams.search ?? '',
    sort:
      initialQsParams.sortBy && initialQsParams.sortDir
        ? { id: initialQsParams.sortBy, direction: initialQsParams.sortDir }
        : null,
  } satisfies ServerTableState;

  const initialState = {
    total: { type: 'items' as const, value: 0 },
    ...(_options.syncToUrl ? qsParamsInitialState : defaultInitialState),
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  const queryParams = useMemo(
    () => ({
      offset: state.offset,
      limit: state.limit,
      ...(state.search && { search: state.search }),
      ...(state.sort && {
        sortBy: state.sort.id,
        sortDir: state.sort.direction,
      }),
    }),
    [state.offset, state.limit, state.search, state.sort],
  );

  const pageCount =
    state.total.type === 'items' ? Math.ceil(state.total.value / state.limit) : state.total.value;
  const pageIndex = Math.ceil(state.offset / state.limit + 1);
  const canNextPage = pageCount > pageIndex;
  const canPreviousPage = pageIndex > 1;

  const queryKey = useMemo(
    () => ({
      offset: state.offset,
      limit: state.limit,
      search: state.search,
      sort: state.sort,
    }),
    [state.offset, state.limit, state.search, state.sort],
  );

  const setLimit = (limit: ServerTableState['limit']) => {
    dispatch({ type: 'limit', value: limit });
  };
  const setOffset = (offset: ServerTableState['offset']) => {
    dispatch({ type: 'offset', value: offset });
  };
  const setSearchInput = (value: ServerTableState['searchInput']) =>
    dispatch({ type: 'searchInput', value });
  const setSort = (sort: ServerTableState['sort']) => {
    dispatch({ type: 'sort', sort });
  };
  const setTotal = (value: Total) => {
    dispatch({ type: 'total', value });
  };
  const setPageIndex = (index: number) => {
    dispatch({ type: 'offset', value: Math.max(0, index - 1) * state.limit });
  };

  const toggleSort = (id: string) => {
    const current = state.sort?.id === id ? state.sort.direction : null;
    const next = getNextState(current);
    setSort(next ? { id, direction: next } : null);
  };

  const reset = () => dispatch({ type: 'reset', state: initialState });

  const nextPage = () => setPageIndex(pageIndex + 1);
  const previousPage = () => setPageIndex(pageIndex - 1);

  useEffect(() => {
    const id = setTimeout(() => {
      dispatch({ type: 'search', value: state.searchInput });
    }, _options.searchDebounceMs ?? DEFAULT_SEARCH_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [state.searchInput, _options.searchDebounceMs]);

  const mounted = useRef(false);
  useEffect(() => {
    if (!_options.syncToUrl) return;
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const params = new URLSearchParams(location.search);
    params.set(qsParamNames.limit, String(state.limit));
    params.set(qsParamNames.offset, String(state.offset));
    // Delete-then-set: a projection must drop keys that no longer hold, else a
    // cleared search / removed sort leaves stale params in the URL.
    if (state.search) params.set(qsParamNames.search, state.search);
    else params.delete(qsParamNames.search);
    if (state.sort) {
      params.set(qsParamNames.sortBy, state.sort.id);
      params.set(qsParamNames.sortDir, state.sort.direction);
    } else {
      params.delete(qsParamNames.sortBy);
      params.delete(qsParamNames.sortDir);
    }
    history.replaceState(null, '', `?${params}`);
  }, [
    state.limit,
    state.offset,
    state.search,
    state.sort,
    qsParamNames.limit,
    qsParamNames.offset,
    qsParamNames.search,
    qsParamNames.sortBy,
    qsParamNames.sortDir,
    _options.syncToUrl,
  ]);

  // Committed changes only: deps are the committed fields, so transient
  // searchInput typing never re-fires.
  useEffect(() => {
    _options.onStateChange?.({
      offset: state.offset,
      limit: state.limit,
      search: state.search,
      sort: state.sort,
    });
  }, [state.offset, state.limit, state.search, state.sort, _options.onStateChange]);

  return {
    setOffset,
    setLimit,
    setSearch: setSearchInput,
    setSort,
    setTotal,
    setPageIndex,
    toggleSort,
    nextPage,
    previousPage,
    pageCount,
    canNextPage,
    canPreviousPage,
    pageIndex,
    queryKey,
    queryParams,
    reset,
    ...state,
  };
}
