// Minimal express request/response doubles for calling controller methods directly.
// routing-controllers' @Req()/@Param()/@Res() decorators are inert outside the framework,
// so controller methods can be invoked as plain functions with these stand-ins.

import { RequestWithUser } from '@/interfaces/auth.interface';
import { User } from '@/interfaces/users.interface';

import { mockAdUsername, mockFirstName, mockLastName } from './mock-data';

export const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    username: mockAdUsername,
    name: `${mockFirstName} ${mockLastName}`,
    givenName: mockFirstName,
    surname: mockLastName,
    groups: [],
    permissions: {},
    ...overrides,
  }) as User;

export const mockReq = (user: User = mockUser()): RequestWithUser => ({ user }) as RequestWithUser;

export interface MockResponse<T = unknown> {
  status: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  /** Last status passed to status(); undefined when the handler only called send(). */
  statusCode?: number;
  /** Last payload passed to send(). */
  body?: T;
}

/** Chainable express response double: both `status()` and `send()` return the response, as express does.
 *  Read the recorded payload off `res.body` rather than the return value of the handler. */
export const mockRes = <T = unknown>(): MockResponse<T> => {
  const res: MockResponse<T> = {
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    send: vi.fn((body: unknown) => {
      res.body = body as T;
      return res;
    }),
  };
  return res;
};
