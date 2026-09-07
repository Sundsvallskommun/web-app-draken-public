const { lstatSync, readFileSync, readdirSync, writeFileSync } = require('node:fs');
const { extname, join } = require('node:path');
const defaults = require('../frontend-environment-defaults.json');

function replaceBasePath(source, placeholder, encoded) {
  const parts = source.split(placeholder);
  // Visit each character at most once. An unanchored backslash regex retries
  // from every backslash in a long non-matching run in a compiled bundle.
  for (let index = 0; index < parts.length - 1; index += 1) {
    if (encoded) {
      parts[index] += encoded;
    } else {
      let end = parts[index].length;
      while (end > 0 && parts[index][end - 1] === '\\') end -= 1;
      parts[index] = parts[index].slice(0, end);
    }
  }
  return parts.join('');
}

function replaceFrontendEnvironment(directory, environment) {
  // The image owns these paths. Reject symbolic links before reading/writing so
  // replacing public configuration cannot affect files outside the build output.
  const nextDirectory = join(directory, '.next');
  const server = join(directory, 'server.js');
  if (!lstatSync(nextDirectory).isDirectory() || !lstatSync(server).isFile()) {
    throw new Error('Frontend configuration requires a regular .next directory and server.js file');
  }
  const values = Object.entries({ ...defaults, ...environment })
    .filter(([name]) => name.startsWith('NEXT_PUBLIC_') || ['DOMAIN_NAME', 'BASE_PATH', 'ADMIN_URL', 'HEALTH_USERNAME', 'HEALTH_PASSWORD'].includes(name))
    .map(([name, value]) => [
      `${name === 'NEXT_PUBLIC_BASEPATH' ? '/' : ''}${name}_PLACEHOLDER`,
      value,
    ]);

  function replace(file) {
    const extension = extname(file);
    if (!['.js', '.json', '.css', '.html'].includes(extension)) return;
    const source = readFileSync(file, 'utf8');
    let result = source;
    for (const [placeholder, value] of values) {
      // Next emits environment values inside JS/JSON strings. Preserve quotes,
      // newlines and backslashes without turning the value into executable code.
      const encoded = ['.js', '.json'].includes(extension) ? JSON.stringify(value).slice(1, -1) : value;
      if (placeholder === '/NEXT_PUBLIC_BASEPATH_PLACEHOLDER') {
        // Route manifests also contain regex strings with escaped slashes. Removing
        // only /PLACEHOLDER would leave a dangling backslash for a root deployment.
        result = replaceBasePath(result, placeholder, encoded);
      } else {
        result = result.split(placeholder).join(encoded);
      }
    }
    const unresolved = result.match(/(?:NEXT_PUBLIC_[A-Z0-9_]+|DOMAIN_NAME|BASE_PATH|ADMIN_URL|HEALTH_USERNAME|HEALTH_PASSWORD)_PLACEHOLDER/u);
    if (unresolved) {
      throw new Error(`Frontend build contains an unresolved environment placeholder for ${unresolved[0].slice(0, -'_PLACEHOLDER'.length)}; declare a value or an explicit default before startup`);
    }
    if (result !== source) writeFileSync(file, result);
  }

  function walk(path) {
    for (const item of readdirSync(path, { withFileTypes: true })) {
      // Next's standalone output can link dependency packages here. They are not
      // application configuration and must never be traversed or rewritten.
      if (item.name === 'node_modules') continue;
      const file = join(path, item.name);
      if (item.isSymbolicLink()) throw new Error('Frontend build output must not contain symbolic links');
      if (item.isDirectory()) walk(file);
      else if (item.isFile()) replace(file);
    }
  }

  walk(nextDirectory);
  replace(server);
}

module.exports = { replaceFrontendEnvironment };
if (require.main === module) {
  if (process.argv.length !== 2) throw new Error('Frontend configuration does not accept a directory argument');
  replaceFrontendEnvironment(join(__dirname, '..', 'frontend'), process.env);
  process.stdout.write('Frontend runtime configuration applied\n');
}
