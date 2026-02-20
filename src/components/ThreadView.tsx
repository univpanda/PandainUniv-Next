import { useCallback, useState } from 'react'
import { PostCard } from './PostCard'
import { ReplyInput, PollDisplay } from './discussion'
import { ReplyToolbar } from './ReplyToolbar'
import {
  useDiscussion,
  useDiscussionView,
  useDiscussionViewActions,
} from '../contexts/DiscussionContext'
import type { Post } from '../types'

export function ThreadView() {
  const { user } = useDiscussion()
  const {
    thread,
    originalPost,
    replies,
    replySortBy,
    replyContent,
    inlineReplyContent,
    replyingToPost,
    submitting,
    repliesPagination,
  } = useDiscussionView()
  const {
    onReplyContentChange,
    onInlineReplyContentChange,
    onAddReply,
    onReplySortChange,
    onToggleReplyToPost,
    onClearReplyTarget,
    onOpenReplies,
  } = useDiscussionViewActions()

  // Reply form open/close state (lifted from ReplyInput collapsible)
  const [replyComposerPosition, setReplyComposerPosition] = useState<'top' | 'bottom' | null>(null)
  const isReplyingToSpecificPost = Boolean(replyingToPost)

  // Memoized handlers to prevent breaking PostCard's memo()
  const handlePostClick = useCallback(
    (post: Post) => onOpenReplies(post),
    [onOpenReplies]
  )

  const handleReplyClick = useCallback(
    (post: Post, e: React.MouseEvent) => {
      // Reply-on-reply should open inline under that specific reply card.
      setReplyComposerPosition(null)
      onToggleReplyToPost(post, e)
    },
    [onToggleReplyToPost]
  )

  if (!thread) return null
  const handleSubmitMainReply = () => onAddReply(thread.id, originalPost?.id ?? null, false)
  const handleCancelMainReply = () => {
    setReplyComposerPosition(null)
  }

  const handleSubmitInlineReply = () => {
    if (!replyingToPost) return
    onAddReply(thread.id, replyingToPost.id, true)
  }

  const handleCancelInlineReply = () => onClearReplyTarget()

  return (
    <div className="thread-view">
      {/* Original Post */}
      {originalPost && originalPost.content !== undefined && (
        <PostCard
          key={originalPost.id}
          post={originalPost}
          variant="original"
          replyCount={replies.length}
          threadId={thread.id}
          threadTitle={thread.title}
        >
          {/* Poll embedded within the original post card */}
          {'has_poll' in thread && thread.has_poll !== false && (
            <PollDisplay threadId={thread.id} userId={user?.id ?? null} />
          )}
        </PostCard>
      )}

      {/* Sort + Reply icon + Pagination toolbar */}
      <div className="reply-toolbar-wrap">
        <ReplyToolbar
          sortBy={replySortBy}
          onSortChange={onReplySortChange}
          showSort={(repliesPagination?.totalCount ?? replies.length) > 1}
          showReplyButton={Boolean(user && replyComposerPosition !== 'top' && !isReplyingToSpecificPost)}
          onReplyClick={() => {
            onClearReplyTarget()
            setReplyComposerPosition('top')
          }}
          pagination={repliesPagination}
        />
        {user && replyComposerPosition === 'top' && (
          <ReplyInput
            value={replyContent}
            onChange={onReplyContentChange}
            onSubmit={handleSubmitMainReply}
            onCancel={handleCancelMainReply}
            placeholder="Write a reply... (Ctrl/Cmd+Enter to submit)"
            submitting={submitting}
            autoFocus
          />
        )}
      </div>

      {replies.length === 0 ? (
        <p className="no-replies">No replies yet</p>
      ) : (
        replies.map((post) => (
          <div key={post.id}>
            <PostCard
              post={post}
              variant="reply"
              threadId={thread.id}
              onClick={handlePostClick}
              onReplyClick={handleReplyClick}
              showSubReplyPreview={true}
            />
            {user && replyingToPost?.id === post.id && (
              <ReplyInput
                value={inlineReplyContent}
                onChange={onInlineReplyContentChange}
                onSubmit={handleSubmitInlineReply}
                onCancel={handleCancelInlineReply}
                placeholder={`Reply to ${post.author_name || 'this post'}... (Ctrl/Cmd+Enter to submit)`}
                submitting={submitting}
                size="small"
                autoFocus
              />
            )}
          </div>
        ))
      )}

      {/* Bottom toolbar mirrors top controls */}
      <div className="reply-toolbar-wrap">
        <ReplyToolbar
          sortBy={replySortBy}
          onSortChange={onReplySortChange}
          showSort={(repliesPagination?.totalCount ?? replies.length) > 1}
          showReplyButton={Boolean(user && replyComposerPosition !== 'bottom' && !isReplyingToSpecificPost)}
          onReplyClick={() => {
            onClearReplyTarget()
            setReplyComposerPosition('bottom')
          }}
          pagination={repliesPagination}
        />
        {user && replyComposerPosition === 'bottom' && (
          <ReplyInput
            value={replyContent}
            onChange={onReplyContentChange}
            onSubmit={handleSubmitMainReply}
            onCancel={handleCancelMainReply}
            placeholder="Write a reply... (Ctrl/Cmd+Enter to submit)"
            submitting={submitting}
            autoFocus
          />
        )}
      </div>

    </div>
  )
}
