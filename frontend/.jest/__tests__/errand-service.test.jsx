import { mockApiErrand, mockApiErrands, mockIErrand, mockIErrands } from '@jestRoot/mocks/mockErrand';
import { getErrand, getErrands } from '@services/errand-service';
const axios = require('axios');

jest.mock('axios');

describe('Errand service', () => {
  it('fetches errands', async () => {
    axios.get.mockResolvedValue({data: mockApiErrands});

    const res = await getErrands();
    expect(res).toEqual(mockIErrands)
  })

  it('fetches an errand by id', async () => {
    axios.get.mockResolvedValue({data: mockApiErrand});

    const {errand} = await getErrand(1);
    expect(errand).toEqual(mockIErrand)
  })
})