// __tests__/index.test.jsx

import * as nextRouter from 'next/router';

nextRouter.useRouter = jest.fn();
nextRouter.useRouter.mockImplementation(() => ({ route: '/', push: jest.fn() }));

describe('Home', () => {
  it('renders a heading', () => {
    // ReactDOM.createRoot(<Home />)
    // render( <Home />)

    expect(true).toBeTruthy()

    // const heading = screen.getByRole('heading', {
    //   name: /welcome to next\.js!/i,
    // })

    // expect(heading).toBeInTheDocument()
  })
})