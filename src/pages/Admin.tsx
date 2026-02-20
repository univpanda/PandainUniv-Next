import { useState } from 'react'
import { UserManagement } from './UserManagement'
import { CountryTab } from './admin/CountryTab'
import { UniversityTab } from './admin/UniversityTab'
import { SchoolTab } from './admin/SchoolTab'
import { DepartmentTab } from './admin/DepartmentTab'
import type {
  AdminProps,
  AdminSubTab,
  CountryTabState,
  DepartmentTabState,
  SchoolTabState,
  UniversityTabState,
} from './admin/types'

export function Admin({ isActive = true }: AdminProps) {
  const [subTab, setSubTab] = useState<AdminSubTab>('pandas')

  const [countryState, setCountryState] = useState<CountryTabState>({
    searchQuery: '',
    sortColumn: 'name',
    sortDirection: 'asc',
    page: 1,
  })

  const [universityState, setUniversityState] = useState<UniversityTabState>({
    searchQuery: '',
    sortColumn: 'university',
    sortDirection: 'asc',
    page: 1,
  })

  const [schoolState, setSchoolState] = useState<SchoolTabState>({
    selectedUniversityId: null,
    searchQuery: '',
    sortColumn: 'school',
    sortDirection: 'asc',
    page: 1,
  })

  const [departmentState, setDepartmentState] = useState<DepartmentTabState>({
    selectedSchoolId: null,
    searchQuery: '',
    sortColumn: 'department',
    sortDirection: 'asc',
    page: 1,
  })

  return (
    <div className="admin-container">
      <div className="admin-tabs">
        <button
          className={`admin-tab ${subTab === 'country' ? 'active' : ''}`}
          onClick={() => setSubTab('country')}
        >
          Country
        </button>
        <button
          className={`admin-tab ${subTab === 'university' ? 'active' : ''}`}
          onClick={() => setSubTab('university')}
        >
          Institute
        </button>
        <button
          className={`admin-tab ${subTab === 'school' ? 'active' : ''}`}
          onClick={() => setSubTab('school')}
        >
          School
        </button>
        <button
          className={`admin-tab ${subTab === 'department' ? 'active' : ''}`}
          onClick={() => setSubTab('department')}
        >
          Department
        </button>
        <button
          className={`admin-tab ${subTab === 'pandas' ? 'active' : ''}`}
          onClick={() => setSubTab('pandas')}
        >
          Pandas
        </button>
      </div>

      <div className="admin-content">
        <div className={subTab !== 'country' ? 'hidden' : ''}>
          <CountryTab state={countryState} setState={setCountryState} />
        </div>
        <div className={subTab !== 'university' ? 'hidden' : ''}>
          <UniversityTab state={universityState} setState={setUniversityState} />
        </div>
        <div className={subTab !== 'school' ? 'hidden' : ''}>
          <SchoolTab state={schoolState} setState={setSchoolState} />
        </div>
        <div className={subTab !== 'department' ? 'hidden' : ''}>
          <DepartmentTab state={departmentState} setState={setDepartmentState} />
        </div>
        <div className={subTab !== 'pandas' ? 'hidden' : ''}>
          <UserManagement isActive={isActive && subTab === 'pandas'} />
        </div>
      </div>
    </div>
  )
}
