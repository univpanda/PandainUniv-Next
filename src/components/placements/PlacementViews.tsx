import { useState } from 'react'
import type { Placement } from '../../types'
import type { AcademicSummaryItem, ComparisonResult } from './types'
import { Pagination } from '../Pagination'

interface PlacementTableProps {
  placements: Placement[]
  showUniversity?: boolean
}

export function PlacementTable({ placements, showUniversity = false }: PlacementTableProps) {
  if (placements.length === 0) {
    return <div className="no-results">No placements found</div>
  }

  return (
    <>
      <div className="placement-table-wrapper placement-desktop">
        <table className="placement-table">
          <thead>
            <tr>
              {showUniversity && <th>University</th>}
              <th className="col-program">Program</th>
              <th>Year</th>
              <th>Name</th>
              <th>Placement</th>
              <th>Designation</th>
            </tr>
          </thead>
          <tbody>
            {placements.map((p) => (
              <tr key={p.id}>
                {showUniversity && <td>{p.university || '-'}</td>}
                <td className="col-program">{p.program || '-'}</td>
                <td>{p.year || '-'}</td>
                <td>{p.name || '-'}</td>
                <td>{p.placementUniv || '-'}</td>
                <td>{p.role || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="placement-cards placement-mobile">
        {placements.map((p) => (
          <div key={p.id} className="placement-card">
            <div className="placement-card-header">
              <span className="placement-card-name">{p.name || '-'}</span>
              <span className="placement-card-year">{p.year || '-'}</span>
            </div>
            <div className="placement-card-placement">{p.placementUniv || '-'}</div>
            {p.role && <div className="placement-card-role">{p.role}</div>}
            <div className="placement-card-meta">
              {p.program && <span className="placement-card-program">{p.program}</span>}
              {p.university && <span className="placement-card-university">{p.university}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

interface ComparisonTableProps {
  results: ComparisonResult[]
  academicSummary: AcademicSummaryItem[]
}

export function ComparisonTable({ results, academicSummary }: ComparisonTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const years = [
    ...new Set(results.flatMap((r) => r.placements.map((p) => p.year)).filter(Boolean)),
  ].sort((a, b) => (b || 0) - (a || 0)) as number[]

  if (results.every((r) => r.placements.length === 0)) {
    return <div className="no-results">No placements found for comparison</div>
  }

  const groupByInstitution = (placements: Placement[]) => {
    const grouped: Record<string, Placement[]> = {}
    placements.forEach((p) => {
      const inst = p.placementUniv || 'Unknown'
      if (!grouped[inst]) grouped[inst] = []
      grouped[inst].push(p)
    })
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))
  }

  const toggleRow = (rowKey: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(rowKey)) {
        next.delete(rowKey)
      } else {
        next.add(rowKey)
      }
      return next
    })
  }

  return (
    <div className="comparison-container">
      <div className="comparison-global-summary">
        <div className="comparison-global-header">
          {results.map((r, idx) => (
            <div key={idx} className="comparison-global-label">
              {r.label}
            </div>
          ))}
        </div>
        <div className="comparison-global-meta">
          {academicSummary.map((item, idx) => (
            <div key={idx} className="comparison-global-meta-item">
              {item.count}/{item.total} ({item.pct}%) academic placements
            </div>
          ))}
        </div>
      </div>
      {years.map((year) => (
        <div key={year} className="comparison-year-section">
          <div className="comparison-year-header">{year}</div>
          <div className="comparison-columns">
            {results.map((r, idx) => {
              const yearPlacements = r.placements.filter((p) => p.year === year)
              const grouped = groupByInstitution(yearPlacements)
              return (
                <div key={idx} className="comparison-column">
                  <div className="comparison-count">
                    <span className="count-number">{yearPlacements.length}</span>
                    <span className="count-label">PLACEMENTS</span>
                  </div>
                  <div className="comparison-institutions">
                    {grouped.length > 0 ? (
                      grouped.map(([inst, placements]) => {
                        const rowKey = `${year}-${idx}-${inst}`
                        const isExpanded = expandedRows.has(rowKey)
                        return (
                          <div key={inst} className="institution-row">
                            <button className="institution-name" onClick={() => toggleRow(rowKey)}>
                              <span>
                                {inst} ({placements.length})
                              </span>
                              <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>+</span>
                            </button>
                            {isExpanded && (
                              <div className="institution-details">
                                {placements.map((p) => (
                                  <div key={p.id} className="placement-detail">
                                    {p.role || 'Unknown designation'}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="no-placements">No placements</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

interface PlacementPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function PlacementPagination({ page, totalPages, onPageChange }: PlacementPaginationProps) {
  return (
    <Pagination
      currentPage={page + 1}
      totalPages={totalPages}
      onPageChange={(nextPage) => onPageChange(nextPage - 1)}
      totalItems={totalPages}
      itemsPerPage={1}
      itemName="pages"
      compact
    />
  )
}
