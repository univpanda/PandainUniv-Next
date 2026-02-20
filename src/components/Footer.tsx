import { FileText } from 'lucide-react'

interface FooterProps {
  onShowTerms: () => void
}

export function Footer({ onShowTerms }: FooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          © {currentYear} PandaInUniv
        </div>
        <div className="footer-right">
          <div className="footer-social">
            <button type="button" className="footer-social-link" onClick={onShowTerms} aria-label="Terms of Use">
              <span className="footer-social-icon" aria-hidden="true">
                <FileText size={16} />
              </span>
              <span className="footer-social-text">Terms of Use</span>
            </button>
            <a
              className="footer-social-link"
              href="https://x.com/pandainuniv"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
            >
              <span className="footer-social-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path d="M13.2 10.7L20.8 2h-1.8l-6.7 7.6L7.1 2H2l7.9 11.1L2 22h1.8l6.9-7.9L16.9 22H22l-8.8-11.3zM11.4 13l-.8-1.2-6-8.6h2.3l4.9 7.1.8 1.2 6.3 9.1h-2.2L11.4 13z" />
                </svg>
              </span>
              <span className="footer-social-text">Twitter</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
