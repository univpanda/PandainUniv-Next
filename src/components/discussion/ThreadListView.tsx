import { ThreadList } from '../ThreadList'
import type { Thread } from '../../types'

interface ThreadListViewProps {
  threads: Thread[]
  bookmarks: Set<number>
  user: { id: string } | null
  onOpenThread: (thread: Thread) => void
  onToggleBookmark: (threadId: number, e: React.MouseEvent) => void
}

export function ThreadListView({
  threads,
  bookmarks,
  user,
  onOpenThread,
  onToggleBookmark,
}: ThreadListViewProps) {
  return (
    <ThreadList
      threads={threads}
      bookmarks={bookmarks}
      user={user}
      onOpenThread={onOpenThread}
      onToggleBookmark={onToggleBookmark}
    />
  )
}
