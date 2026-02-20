export { placementKeys } from './keys'

export type {
  Country,
  University,
  SchoolType,
  School,
  Department,
  UniversityTypeaheadResult,
} from './types'

export {
  useCountries,
  useCreateCountry,
  useDeleteCountry,
  useUpdateCountry,
} from './admin/country'

export {
  useUniversities,
  useCreateUniversity,
  useDeleteUniversity,
  useUpdateUniversity,
} from './admin/university'

export {
  useSchoolsByUniversity,
  useCreateSchool,
  useDeleteSchool,
  useUpdateSchool,
} from './admin/school'

export {
  useDepartmentsBySchool,
  useCreateDepartment,
  useDeleteDepartment,
  useUpdateDepartment,
} from './admin/department'

export {
  usePlacementFilters,
  usePlacementSearch,
  useReverseSearch,
  useProgramsForUniversity,
  useUniversitiesForProgram,
  useProgramsWithPlacements,
  useProgramNamesForAliasUniversityYearRange,
  useProgramsForYearRange,
  useUniversitiesForProgramYearRange,
  useUniversityTypeaheadForProgramYearRange,
  usePlacementInstitutionsForProgramYearRange,
  useProgramNotes,
} from './search'
