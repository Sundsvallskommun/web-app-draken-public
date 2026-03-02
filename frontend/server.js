/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);

    // For _next/static assets: force browser to revalidate on Ctrl+R
    // by removing 'immutable' and setting short max-age.
    // This prevents Chrome from using stale memory-cached JS chunks
    // that break React hydration/interactivity on reload.
    if (parsedUrl.pathname && parsedUrl.pathname.includes('/_next/static')) {
      // Intercept setHeader to strip immutable from any Cache-Control header
      const origSetHeader = res.setHeader.bind(res);
      res.setHeader = (name, value) => {
        if (name.toLowerCase() === 'cache-control' && typeof value === 'string') {
          // Replace immutable caching with revalidation-friendly caching
          value = 'public, max-age=0, must-revalidate';
        }
        return origSetHeader(name, value);
      };

      // Also intercept writeHead in case headers are set there
      const origWriteHead = res.writeHead.bind(res);
      res.writeHead = (statusCode, ...args) => {
        // writeHead can be called as writeHead(status, headers) or writeHead(status, message, headers)
        const headersArg = args.length === 2 ? args[1] : args[0];
        if (headersArg && typeof headersArg === 'object') {
          for (const key of Object.keys(headersArg)) {
            if (key.toLowerCase() === 'cache-control') {
              headersArg[key] = 'public, max-age=0, must-revalidate';
            }
          }
        }
        return origWriteHead(statusCode, ...args);
      };
    }

    handle(req, res, parsedUrl);
  }).listen(process.env.PORT || 3000, () => {
    console.log(`> Ready on http://localhost:${process.env.PORT || 3000}`);
  });
});
