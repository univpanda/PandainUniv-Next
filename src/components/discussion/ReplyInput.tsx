import { memo, useEffect, useLayoutEffect, useCallback, useState, useRef } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { LatexNode } from './LatexExtension'
import { Send, Bold, Italic, Link as LinkIcon, List, Smile, Sigma, X } from 'lucide-react'
import TurndownService from 'turndown'
import { ButtonSpinner } from '../ui'
import 'katex/dist/katex.min.css'

// Common emojis for quick access
const EMOJI_LIST = [
  '😀',
  '😂',
  '😊',
  '🥰',
  '😎',
  '🤔',
  '😢',
  '😡',
  '👍',
  '👎',
  '👏',
  '🙏',
  '💪',
  '🎉',
  '❤️',
  '🔥',
  '✅',
  '❌',
  '⚠️',
  '💡',
  '📈',
  '📉',
  '💰',
  '🚀',
]

// Convert HTML to Markdown
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
})

// Add rule to convert LaTeX nodes - use <latex> tags
turndownService.addRule('latexNode', {
  filter: (node) => {
    return node.nodeName === 'SPAN' && node.hasAttribute('data-latex')
  },
  replacement: (_content, node) => {
    // Get raw text content, strip zero-width spaces used as placeholders
    const latex = (node as HTMLElement).textContent?.replace(/\u200B/g, '').trim() || ''
    return latex ? `<latex>${latex}</latex>` : ''
  },
})

interface ReplyInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel?: () => void
  placeholder?: string
  submitting?: boolean
  size?: 'normal' | 'small'
  autoFocus?: boolean
}

export const ReplyInput = memo(function ReplyInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = 'Write a reply...',
  submitting = false,
  size = 'normal',
  autoFocus = false,
}: ReplyInputProps) {
  const isMobile =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 768px)').matches
  const placeholderText = isMobile ? '' : placeholder
  // Force re-render when editor state changes
  const [, setForceUpdate] = useState(0)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  // Use refs to access current values in handleKeyDown without re-creating editor
  const valueRef = useRef(value)
  const submittingRef = useRef(submitting)
  const onSubmitRef = useRef(onSubmit)
  // Sync refs with props in useLayoutEffect to satisfy React Compiler
  useLayoutEffect(() => {
    valueRef.current = value
    submittingRef.current = submitting
    onSubmitRef.current = onSubmit
  }, [value, submitting, onSubmit])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        horizontalRule: false,
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Placeholder.configure({
        placeholder: placeholderText,
      }),
      LatexNode,
    ],
    content: '',
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: `reply-editor ${size === 'small' ? 'small' : ''}`,
      },
      handleKeyDown: (_view, event) => {
        // Cmd+Enter (Mac) / Ctrl+Enter (Windows) to submit
        // Enter/Shift+Enter = newline (default editor behavior)
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          if (!submittingRef.current && valueRef.current.trim()) {
            onSubmitRef.current()
          }
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      if (html === '<p></p>') {
        onChange('')
      } else {
        const markdown = turndownService.turndown(html)
        onChange(markdown)
      }
      // Force re-render to update button states on content changes
      setForceUpdate((n) => n + 1)
    },
    onSelectionUpdate: () => {
      // Force re-render to update button states (bold/italic/link active state)
      setForceUpdate((n) => n + 1)
    },
    onTransaction: ({ transaction }) => {
      if (transaction.docChanged || transaction.selectionSet || transaction.storedMarks) {
        setForceUpdate((n) => n + 1)
      }
    },
  })

  // Sync external value changes (e.g., clearing after submit)
  useEffect(() => {
    if (editor && value === '' && editor.getHTML() !== '<p></p>') {
      editor.commands.clearContent()
    }
  }, [editor, value])

  // Ensure reliable focus when composer opens with autoFocus enabled.
  useEffect(() => {
    if (!editor || !autoFocus) return
    const timer = setTimeout(() => {
      editor.commands.focus('end')
    }, 0)
    return () => clearTimeout(timer)
  }, [editor, autoFocus])

  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const insertEmoji = useCallback(
    (emoji: string) => {
      if (!editor) return
      editor.chain().focus().insertContent(emoji).run()
      setShowEmojiPicker(false)
    },
    [editor]
  )

  const insertLatex = useCallback(() => {
    if (!editor) return
    // Insert a LaTeX node - user types in the inline input
    editor.chain().focus().insertLatex().run()
  }, [editor])

  // Close emoji picker when clicking outside
  useClickOutside(emojiPickerRef, () => setShowEmojiPicker(false), showEmojiPicker)

  if (!editor) return null

  return (
    <div
      className={`reply-input-container ${size === 'small' ? 'inline-reply-form' : ''} expanded`}
    >
      <div className="reply-input-wrapper">
        <EditorContent editor={editor} />
        <div className="reply-formatting-bar is-visible">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault() // Prevent losing focus/selection
            }}
            onClick={() => {
              editor.chain().focus().toggleBold().run()
            }}
            className={`format-btn ${editor.isActive('bold') ? 'active' : ''}`}
            title="Bold (Ctrl+B)"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
            }}
            onClick={() => {
              editor.chain().focus().toggleItalic().run()
            }}
            className={`format-btn ${editor.isActive('italic') ? 'active' : ''}`}
            title="Italic (Ctrl+I)"
          >
            <Italic size={14} />
          </button>
          <div className="emoji-picker-wrapper" ref={emojiPickerRef}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
              }}
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker)
              }}
              className={`format-btn ${showEmojiPicker ? 'active' : ''}`}
              title="Emoji"
            >
              <Smile size={14} />
            </button>
            {showEmojiPicker && (
              <div className="emoji-picker">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="emoji-btn"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
            }}
            onClick={() => {
              setLink()
            }}
            className={`format-btn ${editor.isActive('link') ? 'active' : ''}`}
            title="Link"
          >
            <LinkIcon size={14} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
            }}
            onClick={() => {
              editor.chain().focus().toggleBulletList().run()
            }}
            className={`format-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
            title="List"
          >
            <List size={14} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
            }}
            onClick={() => {
              insertLatex()
            }}
            className="format-btn"
            title="LaTeX formula"
          >
            <Sigma size={14} />
          </button>
          {/* Submit/Cancel buttons inline in formatting bar */}
          <div className="reply-input-actions">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="cancel-reply-btn"
                title="Cancel"
                aria-label="Cancel reply"
              >
                <X size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting || !value.trim()}
              className={`send-reply-btn ${size === 'small' ? 'small' : ''}`}
            >
              {submitting ? <ButtonSpinner size={14} /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
