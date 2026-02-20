import { Pencil } from 'lucide-react'
import { Pagination } from './Pagination'
import { ReplySortOptions } from './discussion'

interface ReplyToolbarPagination {
  page: number
  setPage: (page: number) => void
  totalPages: number
  totalCount: number
  pageSize: number
}

interface ReplyToolbarProps {
  sortBy: 'popular' | 'new'
  onSortChange: (sort: 'popular' | 'new') => void
  showSort: boolean
  showReplyButton: boolean
  onReplyClick: () => void
  pagination: ReplyToolbarPagination | null | undefined
}

export function ReplyToolbar({
  sortBy,
  onSortChange,
  showSort,
  showReplyButton,
  onReplyClick,
  pagination,
}: ReplyToolbarProps) {
  return (
    <div className="reply-toolbar">
      <div className="reply-toolbar-left">
        <ReplySortOptions sortBy={sortBy} onSortChange={onSortChange} show={showSort} />
        {showReplyButton && (
          <button
            type="button"
            className="reply-icon-btn"
            onClick={onReplyClick}
            title="Write a reply"
            aria-label="Write a reply"
          >
            <Pencil size={18} />
          </button>
        )}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={pagination.setPage}
          totalItems={pagination.totalCount}
          itemsPerPage={pagination.pageSize}
          itemName="replies"
          compact
        />
      )}
    </div>
  )
}
