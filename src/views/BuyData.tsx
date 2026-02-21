import { useState } from 'react'
import {
  Database,
  GraduationCap,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Table,
} from 'lucide-react'
import sampleData from '../data/buydata_sample.json'

// Replace with your actual Dodo Payments product ID
const DODO_PRODUCT_ID = 'pdt_0NY8mGR2g3Ow3xHe92YAG'
const DODO_CHECKOUT_BASE = 'https://checkout.dodopayments.com/buy'

type BuyDataSubTab = 'description' | 'example' | 'distribution' | 'payment'

interface BuyDataProps {
  isActive?: boolean
}

const INSTITUTION_COLUMNS = [
  {
    name: 'id',
    type: 'text',
    description: 'Unique identifier for each institution',
    sample: 'stanford',
  },
  {
    name: 'english_name',
    type: 'text',
    description: 'Official English name of the institution',
    sample: 'Stanford University',
  },
  {
    name: 'country',
    type: 'text',
    description: 'Country where the institution is located',
    sample: 'United States',
  },
]

const GRADUATE_COLUMNS = [
  {
    name: 'id',
    type: 'uuid',
    description: 'Unique identifier for each graduate',
    sample: '3a1f8c2e-...',
  },
  {
    name: 'name',
    type: 'text',
    description: 'Full name of the graduate (cleaned when available)',
    sample: 'Gregory Sepich-Poore',
  },
  { name: 'gender', type: 'text', description: 'Gender of the graduate', sample: 'male' },
]

const EDUCATION_COLUMNS = [
  {
    name: 'id',
    type: 'text',
    description: 'Unique identifier for each education record',
    sample: 'edu_3a1f...',
  },
  {
    name: 'graduate_id',
    type: 'uuid',
    description: 'Foreign key linking to Graduates table',
    sample: '3a1f8c2e-...',
  },
  {
    name: 'degree',
    type: 'text',
    description: 'Degree obtained (PhD, MS, BA, etc.)',
    sample: 'PhD',
  },
  {
    name: 'subject',
    type: 'text',
    description: 'Broad discipline / subject area',
    sample: 'economics',
  },
  {
    name: 'field',
    type: 'text',
    description: 'Broader research field or specialization',
    sample: 'organic chemistry',
  },
  {
    name: 'program_id',
    type: 'text',
    description: 'Unique identifier for the program',
    sample: 'cs_phd',
  },
  {
    name: 'program',
    type: 'text',
    description: 'Name of the academic program',
    sample: 'Computer Science PhD',
  },
  {
    name: 'institution_id',
    type: 'text',
    description: 'Foreign key linking to Institution table',
    sample: 'stanford',
  },
  { name: 'year', type: 'integer', description: 'Year degree was awarded', sample: '2019' },
  {
    name: 'advisor',
    type: 'text',
    description: 'Name of the thesis advisor',
    sample: 'Dr. Jane Smith',
  },
]

const CAREER_COLUMNS = [
  {
    name: 'id',
    type: 'text',
    description: 'Unique identifier for each career record',
    sample: 'car_5b2e...',
  },
  {
    name: 'graduate_id',
    type: 'uuid',
    description: 'Foreign key linking to Graduates table',
    sample: '3a1f8c2e-...',
  },
  {
    name: 'year',
    type: 'integer',
    description: 'Starting year of this career position',
    sample: '2025',
  },
  {
    name: 'designation',
    type: 'text',
    description: 'Job title',
    sample: 'stanford neuroscience postdoc',
  },
  {
    name: 'institution_id',
    type: 'text',
    description: 'Foreign key linking to Institution table',
    sample: 'stanford',
  },
]

const STATS = {
  institution: { rows: '8,478', label: 'Institutions' },
  graduates: { rows: '59,475', label: 'Graduates' },
  education: { rows: '78,037', label: 'Education Records' },
  career: { rows: '62,233', label: 'Career Records' },
}

function ColumnTable({
  icon,
  title,
  columns,
  stat,
}: {
  icon: React.ReactNode
  title: string
  columns: typeof GRADUATE_COLUMNS
  stat: { rows: string; label: string }
}) {
  return (
    <div className="buydata-table-section">
      <div className="buydata-table-header">
        <div className="buydata-table-title">
          {icon}
          <h3>{title}</h3>
        </div>
        <div className="buydata-stat-badge">{stat.rows} rows</div>
      </div>
      <div className="buydata-table-wrapper">
        <table className="buydata-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>Type</th>
              <th>Description</th>
              <th>Sample</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => (
              <tr key={col.name}>
                <td>
                  <code>{col.name}</code>
                </td>
                <td>
                  <span className="buydata-type">{col.type}</span>
                </td>
                <td>{col.description}</td>
                <td>
                  <span className="buydata-sample">{col.sample}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SampleTable({
  title,
  icon,
  rows,
}: {
  title: string
  icon: React.ReactNode
  rows: Record<string, string | null>[]
}) {
  if (!rows.length) return null
  const columns = Object.keys(rows[0])
  return (
    <div className="buydata-table-section">
      <div className="buydata-table-header">
        <div className="buydata-table-title">
          {icon}
          <h3>{title}</h3>
        </div>
        <div className="buydata-stat-badge">{rows.length} sample rows</div>
      </div>
      <div className="buydata-table-wrapper">
        <table className="buydata-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col}>
                    <span className="buydata-sample">{row[col] ?? '—'}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DistributionBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = Math.round((count / max) * 100)
  return (
    <div className="buydata-dist-row">
      <span className="buydata-dist-label">{label}</span>
      <div className="buydata-dist-bar-bg">
        <div className="buydata-dist-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="buydata-dist-count">{count.toLocaleString()}</span>
    </div>
  )
}

function DataExampleTab() {
  return (
    <div className="buydata-example">
      <p className="buydata-example-note">Below is a sample of 5 rows from each table.</p>

      <SampleTable
        title="Institution"
        icon={<Building2 size={20} />}
        rows={sampleData.sample.institution}
      />
      <SampleTable
        title="Graduates"
        icon={<Database size={20} />}
        rows={sampleData.sample.graduates}
      />
      <SampleTable
        title="Education"
        icon={<GraduationCap size={20} />}
        rows={sampleData.sample.education}
      />
      <SampleTable title="Career" icon={<Briefcase size={20} />} rows={sampleData.sample.career} />
    </div>
  )
}

function DistributionTab() {
  const yearEntries = Object.entries(sampleData.distributions.year)
    .map(([y, c]) => ({ year: Number(y), count: c }))
    .filter((d) => d.year >= 2000)
  const maxYear = Math.max(...yearEntries.map((d) => d.count))

  const subjectEntries = Object.entries(sampleData.distributions.subject)
    .map(([s, c]) => ({ subject: s, count: c }))
    .slice(0, 20)
  const maxSubject = Math.max(...subjectEntries.map((d) => d.count))

  const institutionEntries = Object.entries(sampleData.distributions.institution)
    .map(([name, c]) => ({ name, count: c }))
    .slice(0, 20)
  const maxInstitution = Math.max(...institutionEntries.map((d) => d.count))

  return (
    <div className="buydata-example">
      {/* Year distribution */}
      <div className="buydata-table-section">
        <div className="buydata-table-header">
          <div className="buydata-table-title">
            <GraduationCap size={20} />
            <h3>PhD Graduation Year Distribution (2000+)</h3>
          </div>
        </div>
        <div className="buydata-dist-container">
          {yearEntries.map((d) => (
            <DistributionBar key={d.year} label={String(d.year)} count={d.count} max={maxYear} />
          ))}
        </div>
      </div>

      {/* Institution distribution */}
      <div className="buydata-table-section">
        <div className="buydata-table-header">
          <div className="buydata-table-title">
            <Building2 size={20} />
            <h3>Top 20 PhD Institutions</h3>
          </div>
        </div>
        <div className="buydata-dist-container">
          {institutionEntries.map((d) => (
            <DistributionBar key={d.name} label={d.name} count={d.count} max={maxInstitution} />
          ))}
        </div>
      </div>

      {/* Subject distribution */}
      <div className="buydata-table-section">
        <div className="buydata-table-header">
          <div className="buydata-table-title">
            <Table size={20} />
            <h3>Top 20 Subjects</h3>
          </div>
        </div>
        <div className="buydata-dist-container">
          {subjectEntries.map((d) => (
            <DistributionBar key={d.subject} label={d.subject} count={d.count} max={maxSubject} />
          ))}
        </div>
      </div>
    </div>
  )
}

function PaymentTab() {
  const [termsExpanded, setTermsExpanded] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formVerified, setFormVerified] = useState(false)

  const handleFormSubmit = () => {
    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedName) {
      setFormError('Please enter your full name.')
      setFormVerified(false)
      return
    }
    if (!trimmedEmail) {
      setFormError('Please enter your email address.')
      setFormVerified(false)
      return
    }
    if (!trimmedEmail.endsWith('.edu')) {
      setFormError('Only .edu email addresses are eligible to purchase data.')
      setFormVerified(false)
      return
    }
    setFormError(null)
    setFormVerified(true)
  }

  return (
    <div className="buydata-payment">
      {/* Data Sharing Agreement */}
      <div className="buydata-terms-section">
        <button className="buydata-terms-toggle" onClick={() => setTermsExpanded(!termsExpanded)}>
          <span>Data Sharing Agreement</span>
          {termsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {termsExpanded && (
          <div className="buydata-terms-content buydata-terms-pdf">
            <iframe
              src="/PandaInUniv_Data_Sharing_Agreement.pdf"
              title="Data Sharing Agreement"
              width="100%"
              height="100%"
            />
          </div>
        )}
      </div>

      {/* Checkbox */}
      <label className="buydata-terms-checkbox">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
        />
        <span>I have read and agree to the Data Sharing Agreement</span>
      </label>

      {/* Identity verification - only after accepting terms */}
      {termsAccepted && (
        <div className="buydata-email-section">
          <label className="buydata-email-label">Full Name</label>
          <div className="buydata-email-row">
            <input
              type="text"
              className={`buydata-email-input ${formVerified ? 'verified' : ''}`}
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
                setFormError(null)
                setFormVerified(false)
              }}
            />
          </div>
          <label className="buydata-email-label" style={{ marginTop: '0.75rem' }}>
            Institutional Email (.edu) — data will be delivered to this address
          </label>
          <div className="buydata-email-row">
            <input
              type="email"
              className={`buydata-email-input ${formError ? 'error' : ''} ${formVerified ? 'verified' : ''}`}
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setFormError(null)
                setFormVerified(false)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleFormSubmit()}
            />
            <button className="buydata-email-verify" onClick={handleFormSubmit}>
              Verify
            </button>
          </div>
          {formError && <p className="buydata-email-error">{formError}</p>}
        </div>
      )}

      {/* Payment gateway - only visible after form verified */}
      {formVerified && (
        <div className="buydata-payment-gateway">
          <h3>Complete Purchase</h3>
          <p>
            Data will be emailed within 24 hours (likely within 1 hour) to{' '}
            <strong>{email.trim().toLowerCase()}</strong> ({fullName.trim()}) after payment.
          </p>
          <a
            className="buydata-pay-button"
            href={`${DODO_CHECKOUT_BASE}/${DODO_PRODUCT_ID}?quantity=1&fullName=${encodeURIComponent(fullName.trim())}&disableFullName=true&email=${encodeURIComponent(email.trim().toLowerCase())}&disableEmail=true&redirect_url=${encodeURIComponent(window.location.origin + '/checkout/success')}`}
            onClick={() => {
              // Save email to localStorage so success page can display it
              try {
                localStorage.setItem('buydata_email', email.trim().toLowerCase())
              } catch {
                // localStorage not available
              }
            }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Proceed to Payment
            <ExternalLink size={16} />
          </a>
        </div>
      )}
    </div>
  )
}

export function BuyData({ isActive = true }: BuyDataProps) {
  const [subTab, setSubTab] = useState<BuyDataSubTab>('description')

  return (
    <div className="buydata-container">
      {/* Sub-tab navigation */}
      <div className="buydata-tabs">
        <button
          className={`buydata-tab ${subTab === 'description' ? 'active' : ''}`}
          onClick={() => setSubTab('description')}
        >
          Description
        </button>
        <button
          className={`buydata-tab ${subTab === 'example' ? 'active' : ''}`}
          onClick={() => setSubTab('example')}
        >
          Example
        </button>
        <button
          className={`buydata-tab ${subTab === 'distribution' ? 'active' : ''}`}
          onClick={() => setSubTab('distribution')}
        >
          Distribution
        </button>
        <button
          className={`buydata-tab ${subTab === 'payment' ? 'active' : ''}`}
          onClick={() => setSubTab('payment')}
        >
          Payment
        </button>
      </div>

      {/* Tab content */}
      <div className="buydata-content">
        <div className={subTab !== 'description' ? 'hidden' : ''}>
          {/* Data statistics overview */}
          <div className="buydata-stats-row">
            <div className="buydata-stat-card">
              <Building2 size={20} />
              <div>
                <div className="buydata-stat-value">{STATS.institution.rows}</div>
                <div className="buydata-stat-label">{STATS.institution.label}</div>
              </div>
            </div>
            <div className="buydata-stat-card">
              <Database size={20} />
              <div>
                <div className="buydata-stat-value">{STATS.graduates.rows}</div>
                <div className="buydata-stat-label">{STATS.graduates.label}</div>
              </div>
            </div>
            <div className="buydata-stat-card">
              <GraduationCap size={20} />
              <div>
                <div className="buydata-stat-value">{STATS.education.rows}</div>
                <div className="buydata-stat-label">{STATS.education.label}</div>
              </div>
            </div>
            <div className="buydata-stat-card">
              <Briefcase size={20} />
              <div>
                <div className="buydata-stat-value">{STATS.career.rows}</div>
                <div className="buydata-stat-label">{STATS.career.label}</div>
              </div>
            </div>
          </div>

          {/* Table descriptions */}
          <ColumnTable
            icon={<Building2 size={20} />}
            title="Institution"
            columns={INSTITUTION_COLUMNS}
            stat={STATS.institution}
          />
          <ColumnTable
            icon={<Database size={20} />}
            title="Graduates"
            columns={GRADUATE_COLUMNS}
            stat={STATS.graduates}
          />
          <ColumnTable
            icon={<GraduationCap size={20} />}
            title="Education"
            columns={EDUCATION_COLUMNS}
            stat={STATS.education}
          />
          <ColumnTable
            icon={<Briefcase size={20} />}
            title="Career"
            columns={CAREER_COLUMNS}
            stat={STATS.career}
          />
        </div>
        <div className={subTab !== 'example' ? 'hidden' : ''}>
          <DataExampleTab />
        </div>
        <div className={subTab !== 'distribution' ? 'hidden' : ''}>
          <DistributionTab />
        </div>
        <div className={subTab !== 'payment' ? 'hidden' : ''}>
          <PaymentTab />
        </div>
      </div>
    </div>
  )
}

export default BuyData
