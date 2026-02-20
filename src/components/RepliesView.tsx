import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { PostCard } from './PostCard'
import { Pagination } from './Pagination'
import { ReplyInput } from './discussion'
import { ReplyToolbar } from './ReplyToolbar'
import {
  useDiscussion,
  useDiscussionView,
  useDiscussionViewActions,
} from '../contexts/DiscussionContext'

export function RepliesView() {
  const { user } = useDiscussion()
  const {
    thread,
    originalPost,
    selectedPost,
    sortedSubReplies,
    replySortBy,
    replyContent,
    submitting,
    subRepliesPagination,
    subRepliesLoading,
  } = useDiscussionView()
  const { onReplyContentChange, onAddReply, onReplySortChange, onGoToThread } = useDiscussionViewActions()

  // Reply form open/close state
  const [replyFormOpen, setReplyFormOpen] = useState(false)

  if (!thread || !originalPost || !selectedPost) return null

  return (
    <div className="replies-view">
      {/* Original Thread Post - compact two-column, clickable to go back to thread */}
      <div className="op-post-wrapper" onClick={() => onGoToThread?.()} title="Go back to thread">
        <PostCard
          post={originalPost}
          variant="original"
          layout="two-column"
          contentPreviewChars={200}
          replyCount={originalPost.reply_count}
          threadId={thread.id}
          threadTitle={thread.title}
        />
      </div>

      {/* Parent Post - full-width focus layout, clickable to go back to thread at this post */}
      <div
        className="parent-post-wrapper"
        onClick={() => onGoToThread(selectedPost.id)}
        title="Go back to thread at this post"
      >
        <PostCard
          post={selectedPost}
          variant="parent"
          layout="flat"
          threadId={thread.id}
          replyCount={subRepliesPagination?.totalCount ?? selectedPost.reply_count}
        />
      </div>

      {/* Sort + Reply icon + Pagination toolbar */}
      <div className="reply-toolbar-wrap">
        <ReplyToolbar
          sortBy={replySortBy}
          onSortChange={onReplySortChange}
          showSort={(subRepliesPagination?.totalCount ?? sortedSubReplies.length) > 1}
          showReplyButton={Boolean(user && !replyFormOpen)}
          onReplyClick={() => setReplyFormOpen(true)}
          pagination={subRepliesPagination}
        />
        {user && replyFormOpen && (
          <ReplyInput
            value={replyContent}
            onChange={onReplyContentChange}
            onSubmit={() => onAddReply(thread.id, selectedPost.id)}
            onCancel={() => setReplyFormOpen(false)}
            placeholder={`Reply to ${selectedPost.author_name}... (Ctrl/Cmd+Enter to submit)`}
            submitting={submitting}
            autoFocus
          />
        )}
      </div>

      {subRepliesLoading ? (
        <div className="loading-replies">
          <Loader2 className="spinner" size={20} />
          <span>Loading replies...</span>
        </div>
      ) : sortedSubReplies.length === 0 ? (
        <p className="no-replies">No replies yet</p>
      ) : (
        sortedSubReplies.map((post) => (
          <PostCard key={post.id} post={post} variant="reply" threadId={thread.id} hideReplyCount />
        ))
      )}

      {/* Bottom Pagination */}
      {subRepliesPagination && subRepliesPagination.totalPages > 1 && (
        <Pagination
          currentPage={subRepliesPagination.page}
          totalPages={subRepliesPagination.totalPages}
          onPageChange={subRepliesPagination.setPage}
          totalItems={subRepliesPagination.totalCount}
          itemsPerPage={subRepliesPagination.pageSize}
          itemName="replies"
          compact
        />
      )}
    </div>
  )
}
