import { handleError } from '@services/api-service'

describe('Api service', () => {
    
  it('Test handleError to throw the error', () => {
    const error = {
        response: {
            status: 401,
            data: {
                message: 'Unauthorized'
            }
        },
        config: {
            url: 'url'
        }
    }
    expect(()=>handleError(error).toThrow(error))

  })

})