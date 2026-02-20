/* eslint-disable react-hooks/set-state-in-effect */
import { memo, useState, useMemo, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import type { Post } from '../types'
import { formatDate, getAvatarUrl, parseAdditionalComments } from '../utils/format'
import { useDiscussionOptional } from '../contexts/DiscussionContext'
import { PostCardActions, PostCardHeader, SubReplyPreview } from './post'
import { UserNameHover } from './UserNameHover'
import { ReplyCount } from './ui'

// Convert <latex> tags into remark-math syntax to avoid raw HTML rendering.
function convertLatexTagsToMath(content: string): string {
  return content.replace(/<latex>([\s\S]*?)<\/latex>/g, (_match, latex) => {
    const trimmed = latex.trim()
    if (!trimmed) return ''

    const hasDoubleDollar = /^\$\$[\s\S]*\$\$$/.test(trimmed)
    const hasBlockEnv = /\\begin\{(equation\*?|align\*?|gather\*?|multline\*?|split|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|smallmatrix|array|cases|subequations)\}/.test(trimmed)

    if (hasDoubleDollar) {
      return trimmed
    }

    if (hasBlockEnv) {
      return `$$\n${trimmed}\n$$`
    }

    return `$${trimmed}$`
  })
}

interface PostCardProps {
  post: Post
  variant?: 'original' | 'reply' | 'parent'
  layout?: 'flat' | 'two-column' // Override default layout (flat for original, two-column for replies)
  contentPreviewChars?: number // Optional collapsed preview limit with "Show more"
  replyCount?: number // Override for original post to show thread reply count
  hideReplyCount?: boolean // Hide reply count entirely (e.g., for sub-replies)
  onClick?: (post: Post) => void
  onReplyClick?: (post: Post, e: React.MouseEvent) => void
  showSubReplyPreview?: boolean
  // Bookmark/Share props (only used for original posts)
  threadId?: number
  threadTitle?: string
  isBookmarked?: boolean
  // Optional overrides (if not using context)
  user?: { id: string } | null
  isAdmin?: boolean
  onDelete?: (post: Post, e: React.MouseEvent) => void
  onToggleFlagged?: (post: Post, e: React.MouseEvent) => void
  onUserDeletedClick?: (e: React.MouseEvent) => void
  // Children rendered between content and footer (e.g., poll)
  children?: React.ReactNode
}

export const PostCard = memo(function PostCard({
  post,
  variant = 'reply',
  layout,
  contentPreviewChars,
  replyCount,
  hideReplyCount = false,
  onClick,
  onReplyClick,
  showSubReplyPreview = false,
  threadId,
  threadTitle,
  isBookmarked,
  // Optional overrides
  user: userProp,
  isAdmin: isAdminProp,
  onDelete: onDeleteProp,
  onToggleFlagged: onToggleFlaggedProp,
  onUserDeletedClick: onUserDeletedClickProp,
  children,
}: PostCardProps) {
  // Use context values with prop fallbacks
  const ctx = useDiscussionOptional()

  const user = userProp ?? ctx?.user ?? null
  const isAdmin = isAdminProp ?? ctx?.isAdmin ?? false
  const onToggleFlagged = onToggleFlaggedProp ?? ctx?.onToggleFlagged
  const isFlagPendingForPost = ctx?.isFlagPendingForPost
  const onDelete = onDeleteProp ?? ctx?.onDelete
  const onUserDeletedClick = onUserDeletedClickProp ?? ctx?.onUserDeletedClick
  const onEdit = ctx?.onEdit

  const displayReplyCount = replyCount ?? post.reply_count
  const hasReplies = displayReplyCount > 0
  const isDeleted = post.is_deleted ?? false
  const isUserDeleted = post.deleted_by === post.author_id
  const isOwner = Boolean(user?.id && post.author_id && user.id === post.author_id)
  const isFlagPending = Boolean(isFlagPendingForPost?.(post.id))

  // Wrap onClick to pass post - stable reference since onClick is memoized by parent
  const handleClick = onClick ? () => onClick(post) : undefined
  const handleReplyClick = onReplyClick ? (e: React.MouseEvent) => onReplyClick(post, e) : undefined

  // Get CSS class for post variant
  const variantClass =
    variant === 'original' ? 'original-post' : variant === 'parent' ? 'parent-post' : 'reply-card'

  // Show more/less for long content
  const CONTENT_LIMIT = contentPreviewChars ?? 2000
  const safeContent = post.content ?? ''
  const isLongContent = safeContent.length > CONTENT_LIMIT
  const [isExpanded, setIsExpanded] = useState(false)
  const displayContent = isLongContent && !isExpanded
    ? safeContent.slice(0, CONTENT_LIMIT) + '...'
    : safeContent

  // Memoize LaTeX processing - only recompute when content changes
  const processedContent = useMemo(
    () => convertLatexTagsToMath(displayContent),
    [displayContent]
  )

  // Highlight optimistic posts (negative IDs) or recently edited posts (within 3 seconds)
  const [isRecentlyEdited, setIsRecentlyEdited] = useState(false)
  useEffect(() => {
    if (!post.edited_at) {
      setIsRecentlyEdited(false)
      return
    }
    const editedAtMs = new Date(post.edited_at).getTime()
    const isRecent = Date.now() - editedAtMs < 3000
    setIsRecentlyEdited(isRecent)
    if (!isRecent) return
    const timer = setTimeout(() => setIsRecentlyEdited(false), 3000)
    return () => clearTimeout(timer)
  }, [post.edited_at])
  const highlightClass = post.id < 0 || isRecentlyEdited ? 'highlight' : ''

  // Deleted posts: hide from non-admins if no replies, show placeholder for users
  if (isDeleted && !isAdmin) {
    if (!hasReplies) return null
    // User view: show "deleted" placeholder (only shown if has replies)
    const deletedBody = (
      <>
        <div className="post-header">
          <div className="post-author">
            <span className="post-date">{formatDate(post.created_at)}</span>
          </div>
        </div>
        <div className="post-content deleted-content">
          <em>This post has been deleted.</em>
        </div>
        {!hideReplyCount && (
          <div className="post-footer">
            <div className="post-actions">
              <ReplyCount count={displayReplyCount} />
            </div>
          </div>
        )}
      </>
    )
    return (
      <div
        className={`post-card ${variantClass} compact deleted-post`}
        onClick={handleClick}
        style={handleClick ? { cursor: 'pointer' } : undefined}
      >
        {(layout === 'two-column' || (layout !== 'flat' && variant !== 'original')) ? (
          <>
            <div className="post-avatar-col">
              <div className="avatar-small deleted-avatar" />
            </div>
            <div className="post-body">{deletedBody}</div>
          </>
        ) : deletedBody}
      </div>
    )
  }

  // Deleted post styling for admin view
  const deletedClass = isDeleted && isAdmin ? 'deleted-post admin-view' : ''

  const isOriginal = variant === 'original'
  // Layout: flat (avatar in header, full-width content) or two-column (avatar left col)
  const useTwoColumn = layout === 'two-column' || (layout !== 'flat' && !isOriginal)
  const authorName = post.author_name || 'Private Panda'

  // Shared content rendered for both layouts
  const postBody = (
    <>
      <PostCardHeader
        post={post}
        isOriginal={isOriginal}
        showAvatar={!useTwoColumn}
        isDeleted={isDeleted}
        isUserDeleted={isUserDeleted}
        isOwner={isOwner}
        isAdmin={isAdmin}
        user={user}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleFlagged={onToggleFlagged}
        onUserDeletedClick={onUserDeletedClick}
        isFlagPending={isFlagPending}
      />

      <div className="post-content markdown-content">
        {post.edited_at && (post.reply_count > 0 || post.likes > 0 || post.dislikes > 0) && (
          <><span className="edited-indicator">(edited)</span><br /></>
        )}
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {processedContent}
        </ReactMarkdown>
        {isLongContent && (
          <button
            className="show-more-btn"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
        {post.additional_comments && (
          <div className="additional-comments">
            <strong>Additional comments (oldest first):</strong>
            {parseAdditionalComments(post.additional_comments).map((comment, idx) => (
              <div key={idx} className="additional-comment-item">
                {comment.timestamp && (
                  <>
                    <strong className="comment-timestamp">{formatDate(comment.timestamp)}:</strong>
                    <br />
                  </>
                )}
                {comment.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {children}

      <div className="post-footer">
        <PostCardActions
          post={post}
          variant={variant}
          displayReplyCount={hideReplyCount ? undefined : displayReplyCount}
          onReplyClick={handleReplyClick}
          threadId={threadId}
          threadTitle={threadTitle}
          isBookmarked={isBookmarked}
          user={userProp}
          hideReplyCount={hideReplyCount}
        />
      </div>

      {showSubReplyPreview && (
        <SubReplyPreview post={post} displayReplyCount={displayReplyCount} onClick={handleClick} />
      )}
    </>
  )

  return (
    <div
      className={`post-card ${variantClass} compact ${useTwoColumn ? 'two-column' : ''} ${hasReplies && variant === 'reply' && onClick ? 'has-replies' : ''} ${deletedClass} ${highlightClass}`}
      onClick={handleClick}
      style={handleClick ? { cursor: 'pointer' } : undefined}
      data-post-id={post.id}
    >
      {useTwoColumn ? (
        // Two-column: avatar left, body right
        <>
          <div className="post-avatar-col">
            <UserNameHover
              userId={post.author_id}
              username={post.author_name ?? 'Private Panda'}
              avatar={post.author_avatar}
              avatarPath={post.author_avatar_path}
              currentUserId={user?.id || null}
            >
              <img
                src={getAvatarUrl(post.author_avatar, authorName, post.author_avatar_path)}
                alt=""
                className="avatar-small"
              />
            </UserNameHover>
          </div>
          <div className="post-body">{postBody}</div>
        </>
      ) : (
        // Flat: avatar inline with name in header, content full width below
        postBody
      )}
    </div>
  )
})
