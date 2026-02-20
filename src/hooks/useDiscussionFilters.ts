import { useState, useCallback, useDeferredValue, useMemo } from 'react'
import type { ThreadSortBy } from './useForumQueries'
import { parseSearchQuery } from '../utils/search'

// UI sort - no longer includes 'bookmarks' (now handled via @bookmarked search)
export type SortBy = ThreadSortBy
export type ReplySortBy = 'popular' | 'new'
export type SearchMode = 'threads' | 'posts'

const THREAD_SORT_KEY = 'discussion.threadSort'
const REPLY_SORT_KEY = 'discussion.replySort'

function getStoredThreadSort(): SortBy {
  try {
    const stored = localStorage.getItem(THREAD_SORT_KEY)
    if (stored === 'popular' || stored === 'recent' || stored === 'new') return stored
  } catch {
    // localStorage unavailable
  }
  return 'popular'
}

function getStoredReplySort(): ReplySortBy {
  try {
    const stored = localStorage.getItem(REPLY_SORT_KEY)
    if (stored === 'popular' || stored === 'new') return stored
  } catch {
    // localStorage unavailable
  }
  return 'popular'
}

export function useDiscussionFilters() {
  // Sort state
  const [sortBy, setSortBy] = useState<SortBy>(() => getStoredThreadSort())
  const [replySortBy, setReplySortByState] = useState<ReplySortBy>(() => getStoredReplySort())

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [searchMode, setSearchMode] = useState<SearchMode>('threads')

  // Parse search query to detect @bookmarked
  const parsedSearch = useMemo(() => parseSearchQuery(deferredSearchQuery), [deferredSearchQuery])

  // Derived state - bookmarks view is now triggered by @bookmarked in search
  const isBookmarksView = parsedSearch.isBookmarked

  // Handle sort change
  const handleSortChange = useCallback((newSort: SortBy) => {
    setSortBy(newSort)
    try {
      localStorage.setItem(THREAD_SORT_KEY, newSort)
    } catch {
      // localStorage unavailable
    }
  }, [])

  const setReplySortBy = useCallback((newSort: ReplySortBy) => {
    setReplySortByState(newSort)
    try {
      localStorage.setItem(REPLY_SORT_KEY, newSort)
    } catch {
      // localStorage unavailable
    }
  }, [])

  // Show bookmarks view by setting search to @bookmarked
  const showBookmarksView = useCallback(() => {
    setSearchQuery('@bookmarked')
  }, [])

  // Set to recent sort (used when navigating to thread from posts search)
  const setRecentSort = useCallback(() => {
    setSortBy('recent')
  }, [])

  return {
    // Sort state
    sortBy,
    replySortBy,
    setReplySortBy,

    // Search state
    searchQuery,
    setSearchQuery,
    deferredSearchQuery,
    searchMode,
    setSearchMode,

    // Parsed search (includes isBookmarked, authorUsername, searchTerms)
    parsedSearch,

    // Derived state
    isBookmarksView,

    // Actions
    handleSortChange,
    showBookmarksView,
    setRecentSort,
  }
}

export type DiscussionFiltersReturn = ReturnType<typeof useDiscussionFilters>
