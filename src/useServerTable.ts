import { useCallback, useEffect, useReducer, useRef } from 'react';
import { debounce } from './lib/debounce';
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
  | { type: 'total'; value: Total };

const reducer = (
  state: ServerTableState & { total: Total },
  action: ReducerAction,
) => {
  switch (action.type) {
    case 'offset': {
      const { type, value } = state.total;
      const totalItems = type === 'items' ? value : state.limit * value;
      const maxOffset = Math.max(0, totalItems - state.limit);
      return {
        ...state,
        offset: Math.min(action.value, maxOffset),
      };
    }
    case 'limit':
      return { ...state, limit: action.value, offset: 0 };
    case 'search':
      return { ...state, search: action.value, offset: 0 };
    case 'searchInput':
      return { ...state, searchInput: action.value };
    case 'sort':
      return { ...state, sort: action.sort, offset: 0 };
    case 'total':
      return { ...state, total: action.value, offset: 0 };
  }
};

const parseParams = (params: URLSearchParams) => {
  const limit = params.get('limit');
  const offset = params.get('offset');
  const search = params.get('search');
  const sortBy = params.get('sortBy');
  const sortDir = params.get('sortDir');
  return {
    limit: typeof limit !== 'string' ? 20 : parseInt(limit, 10),
    offset: typeof offset !== 'string' ? 0 : parseInt(offset, 10),
    search: typeof search !== 'string' ? '' : search,
    sortBy: typeof sortBy !== 'string' ? undefined : sortBy,
    sortDir:
      typeof sortDir !== 'string' ? undefined : (sortDir as SortDirection),
  } satisfies Pick<ServerTableState, 'offset' | 'limit' | 'search'> & {
    sortBy?: string | undefined;
    sortDir?: SortDirection | undefined;
  };
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

export function useServerTable(
  _options: UseServerTableOptions = {},
): UseServerTableReturn {
  const urlSearchParams = new URLSearchParams(location.search);
  const qsParams = parseParams(urlSearchParams);

  const defaultInitialState = {
    limit: _options.defaultLimit ?? 20,
    offset: _options.defaultOffset ?? 0,
    search: _options.defaultSearch ?? '',
    searchInput: _options.defaultSearch ?? '',
    sort: _options.defaultSort ?? null,
  } satisfies ServerTableState;

  const qsParamsInitialState = {
    limit: qsParams.limit,
    offset: qsParams.offset,
    search: qsParams.search,
    searchInput: qsParams.search,
    sort:
      qsParams.sortBy && qsParams.sortDir
        ? { id: qsParams.sortBy, direction: qsParams.sortDir }
        : null,
  } satisfies ServerTableState;

  const initialState = {
    total: { type: 'items' as const, value: 0 },
    ...(_options.syncToUrl ? qsParamsInitialState : defaultInitialState),
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  const pageCount =
    state.total.type === 'items'
      ? Math.ceil(state.total.value / state.limit)
      : state.total.value;
  const currentPage = Math.ceil(state.offset / state.limit + 1);
  const canNextPage = pageCount > currentPage;
  const canPreviousPage = currentPage > 1;

  const setLimit = (limit: ServerTableState['limit']) => {
    dispatch({ type: 'limit', value: limit });
    urlSearchParams.set('limit', limit.toString());
  };
  const setOffset = (offset: ServerTableState['offset']) => {
    dispatch({ type: 'offset', value: offset });
    urlSearchParams.set('offset', offset.toString());
  };
  const setSearchInput = (value: ServerTableState['searchInput']) =>
    dispatch({ type: 'searchInput', value });
  const setSort = (sort: ServerTableState['sort']) => {
    dispatch({ type: 'sort', sort });
    if (sort?.id) urlSearchParams.set('sortBy', sort.id);
    if (sort?.direction) urlSearchParams.set('sortDir', sort.direction);
  };
  const setTotal = (value: Total) => dispatch({ type: 'total', value });
  const setPageIndex = (index: number) => {
    dispatch({ type: 'offset', value: (index - 1) * state.limit });
  };

  const toggleSort = (id: string) => {
    const current = state.sort?.id === id ? state.sort.direction : null;
    const next = getNextState(current);
    setSort(next ? { id, direction: next } : null);
  };

  const setSearchDebounced = useCallback(
    debounce(() => {
      dispatch({ type: 'search', value: state.searchInput });
      urlSearchParams.set('search', state.searchInput);
    }, 350),
    [state.searchInput],
  );

  useEffect(() => {
    setSearchDebounced();
    return setSearchDebounced.cancel;
  }, [state.searchInput, setSearchDebounced]);

  return {
    setOffset,
    setLimit,
    setSearch: setSearchInput,
    setSort,
    setTotal,
    setPageIndex,
    toggleSort,
    pageCount,
    canNextPage,
    canPreviousPage,
    ...state,
  };
  throw new Error('useServerTable: not implemented yet');
}
