import { useEffect, useMemo, useRef, useState } from 'react'
import { Pagination } from '../components/Pagination'
import { LogIn, EyeOff, ChevronDown, PenLine, Search } from 'lucide-react'
import { SearchInput } from '../components/ui'
import { getSearchHelpText } from '../utils/search'
import type { SortBy } from '../hooks/useDiscussionFilters'
import { useDiscussionPage } from '../hooks/useDiscussionPage'
import { DiscussionProvider } from '../contexts/DiscussionContext'
import { ThreadView } from '../components/ThreadView'
import { RepliesView } from '../components/RepliesView'
import { LoadingSpinner, QueryErrorBanner, EmptyState } from '../components/ui'
import {
  EditModal,
  DeleteModal,
  UserDeletedInfoModal,
  NewThreadForm,
  DiscussionHeader,
  ThreadListView,
  PostsSearchView,
  BookmarkedPostsView,
} from '../components/discussion'
import { useClickOutside } from '../hooks/useClickOutside'

interface DiscussionProps {
  resetToList?: number
  isActive?: boolean
  initialSearch?: {
    searchQuery: string
  } | null
  onInitialSearchConsumed?: () => void
  initialNavigation?: {
    threadId: number
    threadTitle?: string | null
    postId: number | null
    postParentId: number | null
  } | null
  onInitialNavigationConsumed?: () => void
}

export function Discussion({
  resetToList,
  isActive = true,
  initialSearch,
  onInitialSearchConsumed,
  initialNavigation,
  onInitialNavigationConsumed,
}: DiscussionProps) {
  const [searchExpanded, setSearchExpanded] = useState(false)
  const {
    auth,
    nav,
    threadForm,
    replyForm,
    sort,
    search,
    data,
    status,
    postActions,
    bookmarkActions,
    modalState,
    modalActions,
    handleRetry,
  } = useDiscussionPage({ resetToList })

  const { goToList, openThreadById, openRepliesById, triggerHighlightPost } = nav
  const { setSearchQuery } = search
  const { showNewThread, setShowNewThread } = threadForm
  const isSearchRowOpen = searchExpanded || Boolean(search.searchQuery)

  // Apply initial search when provided from external navigation
  // This handles @username, @bookmarked, @op, @replies, and regular text searches from profile dropdown
  useEffect(() => {
    if (initialSearch) {
      // Navigate back to list view first (in case a thread is open)
      goToList()
      setSearchQuery(initialSearch.searchQuery)
      onInitialSearchConsumed?.()
    }
  }, [initialSearch, onInitialSearchConsumed, goToList, setSearchQuery])

  useEffect(() => {
    if (resetToList) {
      setSearchQuery('')
    }
  }, [resetToList, setSearchQuery])

  // Handle direct navigation to a specific post (from notifications)
  useEffect(() => {
    if (initialNavigation) {
      const { threadId, threadTitle, postId, postParentId } = initialNavigation

      if (postId === null) {
        // Thread-only deep link
        openThreadById(threadId, threadTitle)
      } else if (postParentId === null) {
        // Post is the OP or a direct reply to OP - open thread view
        openThreadById(threadId, threadTitle)
        triggerHighlightPost(postId)
      } else {
        // Post is a reply (has a parent) - open replies view for that post
        openRepliesById(threadId, postId, threadTitle)
      }
      onInitialNavigationConsumed?.()
    }
  }, [
    initialNavigation,
    onInitialNavigationConsumed,
    openThreadById,
    openRepliesById,
    triggerHighlightPost,
  ])

  // Memoize core props (shared between ThreadView and RepliesView)
  const coreProps = useMemo(
    () => ({
      user: auth.user,
      isAdmin: auth.isAdmin,
      bookmarks: data.bookmarks,
      postBookmarks: data.postBookmarks,
    }),
    [auth.user, auth.isAdmin, data.bookmarks, data.postBookmarks]
  )

  // Memoize action props (shared between ThreadView and RepliesView)
  const actionProps = useMemo(
    () => ({
      onVote: postActions.votePost,
      onToggleBookmark: postActions.toggleBookmark,
      onTogglePostBookmark: postActions.togglePostBookmark,
      onEdit: postActions.handleEditPost,
      onDelete: postActions.handleDeletePost,
      onUserDeletedClick: postActions.handleUserDeletedClick,
      onToggleFlagged: postActions.toggleFlagged,
      isVotePendingForPost: postActions.isVotePendingForPost,
      isThreadBookmarkPending: postActions.isThreadBookmarkPending,
      isPostBookmarkPending: postActions.isPostBookmarkPending,
      isFlagPendingForPost: postActions.isFlagPendingForPost,
    }),
    [
      postActions.votePost,
      postActions.toggleBookmark,
      postActions.togglePostBookmark,
      postActions.handleEditPost,
      postActions.handleDeletePost,
      postActions.handleUserDeletedClick,
      postActions.toggleFlagged,
      postActions.isVotePendingForPost,
      postActions.isThreadBookmarkPending,
      postActions.isPostBookmarkPending,
      postActions.isFlagPendingForPost,
    ]
  )

  // Memoize viewData for ThreadView to prevent unnecessary context updates
  const threadViewData = useMemo(
    () => ({
      thread: nav.selectedThread,
      originalPost: data.originalPost,
      replies: data.replies,
      replySortBy: sort.replySortBy,
      replyContent: replyForm.replyContent,
      inlineReplyContent: replyForm.inlineReplyContent,
      replyingToPost: replyForm.replyingToPost,
      submitting: status.submitting,
      repliesPagination: data.pagination.replies,
    }),
    [
      nav.selectedThread,
      data.originalPost,
      data.replies,
      sort.replySortBy,
      replyForm.replyContent,
      replyForm.inlineReplyContent,
      replyForm.replyingToPost,
      status.submitting,
      data.pagination.replies,
    ]
  )

  // Memoize viewActions for ThreadView
  const threadViewActions = useMemo(
    () => ({
      onReplyContentChange: replyForm.setReplyContent,
      onInlineReplyContentChange: replyForm.setInlineReplyContent,
      onAddReply: replyForm.addReply,
      onReplySortChange: sort.setReplySortBy,
      onToggleReplyToPost: replyForm.toggleReplyToPost,
      onClearReplyTarget: replyForm.clearInlineReplyForm,
      onOpenReplies: nav.openReplies,
    }),
    [
      replyForm.setReplyContent,
      replyForm.setInlineReplyContent,
      replyForm.addReply,
      sort.setReplySortBy,
      replyForm.toggleReplyToPost,
      replyForm.clearInlineReplyForm,
      nav.openReplies,
    ]
  )

  // Memoize viewData for RepliesView
  const repliesViewData = useMemo(
    () => ({
      thread: nav.selectedThread,
      originalPost: data.originalPost,
      selectedPost: data.resolvedSelectedPost,
      sortedSubReplies: data.sortedSubReplies,
      subRepliesLoading: data.subRepliesLoading,
      replySortBy: sort.replySortBy,
      replyContent: replyForm.replyContent,
      submitting: status.submitting,
      subRepliesPagination: data.pagination.subReplies,
    }),
    [
      nav.selectedThread,
      data.originalPost,
      data.resolvedSelectedPost,
      data.sortedSubReplies,
      data.subRepliesLoading,
      sort.replySortBy,
      replyForm.replyContent,
      status.submitting,
      data.pagination.subReplies,
    ]
  )

  // Memoize viewActions for RepliesView
  const repliesViewActions = useMemo(
    () => ({
      onReplyContentChange: replyForm.setReplyContent,
      onAddReply: replyForm.addReply,
      onReplySortChange: sort.setReplySortBy,
      onGoToThread: nav.goToThread,
    }),
    [replyForm.setReplyContent, replyForm.addReply, sort.setReplySortBy, nav.goToThread]
  )

  const newThreadComposerRef = useRef<HTMLDivElement | null>(null)

  const searchHelpText = useMemo(
    () => getSearchHelpText(!!auth.user, auth.isAdmin),
    [auth.user, auth.isAdmin]
  )

  useClickOutside(
    newThreadComposerRef,
    () => {
      if (showNewThread) {
        setShowNewThread(false)
      }
    },
    showNewThread
  )

  useEffect(() => {
    if (!isActive && showNewThread) {
      setShowNewThread(false)
    }
  }, [isActive, showNewThread, setShowNewThread])

  useEffect(() => {
    if (!showNewThread) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNewThread(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showNewThread, setShowNewThread])

  return (
    <div className="discussion-container no-sidebar">
      {/* Modals */}
      {modalState.editingPost && (
        <EditModal
          post={modalState.editingPost}
          editContent={modalState.editContent}
          additionalComment={modalState.additionalComment}
          submitting={status.submitting}
          onEditContentChange={modalActions.setEditContent}
          onAdditionalCommentChange={modalActions.setAdditionalComment}
          onSubmit={postActions.submitEdit}
          onClose={modalActions.closeEditModal}
        />
      )}
      {modalState.deletingPost && (
        <DeleteModal
          post={modalState.deletingPost}
          submitting={status.submitting}
          onConfirm={postActions.confirmDelete}
          onClose={modalActions.closeDeleteModal}
        />
      )}
      {modalState.showUserDeletedInfo && (
        <UserDeletedInfoModal onClose={modalActions.hideUserDeletedInfo} />
      )}

      {/* Main Content */}
      <main className="discussion-main">
        {/* Header */}
        <DiscussionHeader
          view={nav.view}
          threadTitle={nav.selectedThread?.title}
          onGoToThreadFromTitle={nav.goToThreadFromTitle}
        />

        {/* New Thread Composer */}
        {nav.view === 'list' && (
          <div className="discussion-toolbar-wrap discussion-toolbar-wrap--top" ref={newThreadComposerRef}>
            <div className="discussion-toolbar-row">
              {/* Left side: Sort + Take a bite */}
              <div className="discussion-toolbar-left">
                <div className="discussion-utility discussion-utility-sort">
                  <div className="sort-options sort-select-container">
                    <select
                      className="sort-select"
                      value={sort.sortBy}
                      onChange={(e) => sort.handleSortChange(e.target.value as SortBy)}
                      aria-label="Sort threads"
                    >
                      <option value="popular">Popular</option>
                      <option value="recent">Recent</option>
                      <option value="new">New</option>
                    </select>
                    <ChevronDown className="sort-select-icon" size={16} aria-hidden="true" />
                  </div>
                </div>
                {auth.user && !showNewThread && (
                  <button
                    type="button"
                    className="take-bite-btn"
                    onClick={() => setShowNewThread(true)}
                    title="Take a bite"
                  >
                    <PenLine size={16} />
                    <span>Take a bite</span>
                  </button>
                )}
                {!isSearchRowOpen && (
                  <button
                    type="button"
                    className="take-bite-btn forage-btn"
                    onClick={() => setSearchExpanded(true)}
                    title="Forage for discussions"
                  >
                    <Search size={16} />
                    <span>Forage</span>
                  </button>
                )}
              </div>

              {/* Right side: Forage + Admin controls + Pagination */}
              <div className="discussion-toolbar-right">
                {auth.isAdmin && (
                  <input
                    type="number"
                    min="1"
                    max="500"
                    className="page-size-input"
                    value={data.pageSizeControl.pageSizeInput}
                    onChange={(e) => data.pageSizeControl.setPageSizeInput(e.target.value)}
                    onBlur={data.pageSizeControl.handlePageSizeBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        data.pageSizeControl.handlePageSizeBlur()
                        e.currentTarget.blur()
                      }
                    }}
                    title="Items per page"
                  />
                )}
                {!status.loading &&
                  !status.queryError &&
                  !status.isPostsSearchView &&
                  !status.isSearchingPrivateUser &&
                  !status.isBookmarksView &&
                  data.pagination.threads.totalPages > 1 && (
                    <Pagination
                      currentPage={data.pagination.threads.page}
                      totalPages={data.pagination.threads.totalPages}
                      onPageChange={data.pagination.threads.setPage}
                      totalItems={data.pagination.threads.totalCount}
                      itemsPerPage={data.pagination.threads.pageSize}
                      itemName="threads"
                      compact
                    />
                  )}
              </div>
            </div>
            {isSearchRowOpen && (
              <div className="discussion-search-row">
                <SearchInput
                  value={search.searchQuery}
                  onChange={search.setSearchQuery}
                  placeholder="Forage for discussions..."
                  className={`grove-search ${search.searchQuery ? 'has-value' : ''}`}
                  iconSize={16}
                  showHelp
                  helpText={searchHelpText}
                  helpPlacement="outside"
                />
                <button
                  type="button"
                  className="cancel-btn search-cancel-btn"
                  onClick={() => {
                    search.setSearchQuery('')
                    setSearchExpanded(false)
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
            {auth.user && showNewThread && (
              <NewThreadForm
                title={threadForm.newThreadTitle}
                content={threadForm.newThreadContent}
                submitting={status.submitting}
                onTitleChange={threadForm.setNewThreadTitle}
                onContentChange={threadForm.setNewThreadContent}
                onSubmit={threadForm.createThread}
                onCancel={() => setShowNewThread(false)}
                isPollEnabled={threadForm.isPollEnabled}
                onPollToggle={threadForm.setIsPollEnabled}
                pollOptions={threadForm.pollOptions}
                onPollOptionsChange={threadForm.setPollOptions}
                pollSettings={threadForm.pollSettings}
                onPollSettingsChange={threadForm.setPollSettings}
              />
            )}
          </div>
        )}

        {/* Loading - only show spinner for initial load (no data yet) */}
        {status.loading && <LoadingSpinner className="discussion-loading" />}

        {/* Background fetching indicator - subtle, doesn't block content */}
        {status.isFetching && !status.loading && <div className="discussion-fetching-indicator" />}

        {/* Query Error */}
        {status.queryError && !status.loading && (
          <QueryErrorBanner
            message={
              nav.view === 'list'
                ? 'Failed to load threads. Please try again.'
                : 'Failed to load posts. Please try again.'
            }
            onRetry={handleRetry}
          />
        )}

        {/* Private User Search Message */}
        {status.isSearchingPrivateUser && nav.view === 'list' && (
          <EmptyState
            icon={EyeOff}
            description={`@${status.searchedAuthorUsername}'s profile is private.`}
          />
        )}

        {/* Thread List View (normal mode, not bookmarks) */}
        {nav.view === 'list' &&
          !status.loading &&
          !status.queryError &&
          !status.isPostsSearchView &&
          !status.isSearchingPrivateUser &&
          !status.isBookmarksView && (
            <ThreadListView
              threads={data.threads}
              bookmarks={data.bookmarks}
              user={auth.user}
              onOpenThread={nav.openThread}
              onToggleBookmark={postActions.toggleBookmark}
            />
          )}

        {/* Bottom Toolbar (mirrors top toolbar) */}
        {nav.view === 'list' &&
          !status.loading &&
          !status.queryError &&
          !status.isPostsSearchView &&
          !status.isSearchingPrivateUser &&
          !status.isBookmarksView &&
          data.pagination.threads.totalPages > 1 && (
            <div className="discussion-toolbar-wrap discussion-toolbar-wrap--bottom">
              <div className="discussion-toolbar-row">
                <div className="discussion-toolbar-left">
                  <div className="discussion-utility discussion-utility-sort">
                    <div className="sort-options sort-select-container">
                      <select
                        className="sort-select"
                        value={sort.sortBy}
                        onChange={(e) => sort.handleSortChange(e.target.value as SortBy)}
                        aria-label="Sort threads"
                      >
                        <option value="popular">Popular</option>
                        <option value="recent">Recent</option>
                        <option value="new">New</option>
                      </select>
                      <ChevronDown
                        className="sort-select-icon"
                        size={16}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  {auth.user && !showNewThread && (
                    <button
                      type="button"
                      className="take-bite-btn"
                      onClick={() => setShowNewThread(true)}
                      title="Take a bite"
                    >
                      <PenLine size={16} />
                      <span>Take a bite</span>
                    </button>
                  )}
                </div>
                <div className="discussion-toolbar-right">
                  <Pagination
                    currentPage={data.pagination.threads.page}
                    totalPages={data.pagination.threads.totalPages}
                    onPageChange={data.pagination.threads.setPage}
                    totalItems={data.pagination.threads.totalCount}
                    itemsPerPage={data.pagination.threads.pageSize}
                    itemName="threads"
                    compact
                  />
                </div>
              </div>
            </div>
          )}

        {/* Bookmarked Posts View */}
        {nav.view === 'list' && !status.loading && !status.queryError && status.isBookmarksView && (
          <BookmarkedPostsView
            posts={data.bookmarkedPosts}
            pagination={data.pagination.bookmarks}
            user={auth.user}
            isAdmin={auth.isAdmin}
            onGoToThread={nav.openThread}
            onGoToPost={bookmarkActions.goToSearchedPost}
            onDeletePost={postActions.handleDeletePost}
            onToggleFlagged={postActions.toggleFlagged}
            onUserDeletedClick={postActions.handleUserDeletedClick}
          />
        )}

        {/* Posts Search View */}
        {nav.view === 'list' &&
          status.isPostsSearchView &&
          !status.postsSearchLoading &&
          !status.queryError &&
          !status.isSearchingPrivateUser && (
            <PostsSearchView
              posts={data.postsSearchData}
              pagination={data.pagination.postsSearch}
              user={auth.user}
              isAdmin={auth.isAdmin}
              onGoToThread={nav.openThread}
              onGoToPost={bookmarkActions.goToSearchedPost}
              onDeletePost={postActions.handleDeletePost}
              onToggleFlagged={postActions.toggleFlagged}
              onUserDeletedClick={postActions.handleUserDeletedClick}
            />
          )}

        {/* Thread View */}
        {nav.view === 'thread' && !status.loading && !status.queryError && nav.selectedThread && (
          <DiscussionProvider
            core={coreProps}
            actions={actionProps}
            viewData={threadViewData}
            viewActions={threadViewActions}
          >
            <ThreadView />
          </DiscussionProvider>
        )}

        {/* Replies View */}
        {nav.view === 'replies' &&
          !status.loading &&
          !status.queryError &&
          nav.selectedThread &&
          data.originalPost &&
          data.resolvedSelectedPost && (
            <DiscussionProvider
              core={coreProps}
              actions={actionProps}
              viewData={repliesViewData}
              viewActions={repliesViewActions}
            >
              <RepliesView />
            </DiscussionProvider>
          )}

        {/* Sign in prompt */}
        {!auth.user && nav.view === 'list' && (
          <div className="sign-in-prompt">
            <button className="auth-button auth-sign-in" onClick={auth.signInWithGoogle}>
              <LogIn size={18} />
              <span>Sign in</span>
            </button>
            <span className="sign-in-text-full">to create threads and join the discussion</span>
            <span className="sign-in-text-short">to join discussion</span>
          </div>
        )}
      </main>
    </div>
  )
}
