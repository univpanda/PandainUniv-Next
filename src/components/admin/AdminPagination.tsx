interface AdminPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function AdminPagination({ page, totalPages, onPageChange }: AdminPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="admin-pagination">
      <button className="btn-secondary btn-small" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
        Previous
      </button>
      <span className="page-info">
        Page {page} of {totalPages}
      </span>
      <button
        className="btn-secondary btn-small"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
      </button>
    </div>
  )
}
