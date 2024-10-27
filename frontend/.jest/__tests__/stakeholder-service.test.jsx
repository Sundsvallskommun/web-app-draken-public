// __tests__/stakeholder-service.test.jsx
import { applicantStakeholder, mockIErrand, applicantAdress, fellowApplicantStakeholder } from '@jestRoot/mocks/mockErrand'
import { getOwnerStakeholder, getOwnerStakeholderAddress, getFellowApplicants, } from '@services/stakeholder-service'

describe('Stakeholder service', () => {
  it('finds the owner stakeholder correctly', () => {
    const e = mockIErrand
    const s = getOwnerStakeholder(e)
    expect(s).toEqual(applicantStakeholder)
  })

  it('finds the owner stakeholders adress correctly', () => {
    const e = mockIErrand
    const s = getOwnerStakeholderAddress(e)
    expect(s).toEqual(applicantAdress)
  })

  it('finds the fellow applicant stakeholders correctly', () => {
    const e = mockIErrand
    const s = getFellowApplicants(e)
    expect(s).toEqual([fellowApplicantStakeholder])
  })
})