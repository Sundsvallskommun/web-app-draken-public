// Boots an express app on an ephemeral port so a test can make real HTTP requests through
// the production middleware chain.
//
// Deliberately dependency-free: the auth tests only need a status code back, which the
// standard library already covers. Distinct from helpers/http.ts, which fakes req/res to
// call controller methods directly - this one exercises the whole stack, guard included.

import http from 'node:http';
import type { AddressInfo } from 'node:net';

import type { Application } from 'express';

export interface TestServer {
  baseUrl: string;
  /**
   * Sends a request and resolves with the response.
   *
   * Redirects are not followed. A 3xx is an outcome the auth tests need to observe rather
   * than resolve, and following one could send the process at a real host.
   */
  request: (method: string, path: string) => ReturnType<typeof fetch>;
  close: () => Promise<void>;
}

/** Listens on a free port. Always paired with `close()` in afterAll. */
export const startServer = async (app: Application): Promise<TestServer> => {
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));

  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    request: (method, path) => fetch(`${baseUrl}${path}`, { method: method.toUpperCase(), redirect: 'manual' }),
    close: () =>
      new Promise<void>(resolve => {
        // fetch holds sockets open, and server.close() waits for them to end - without this
        // teardown blocks until the connection pool's idle timeout.
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};
