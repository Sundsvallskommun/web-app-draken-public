const { readFileSync, readdirSync, writeFileSync } = require('node:fs');
const { extname, join } = require('node:path');

function replaceFrontendEnvironment(directory, environment) {
  const values = Object.entries(environment)
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
        result = result.replace(/\\*\/NEXT_PUBLIC_BASEPATH_PLACEHOLDER/gu, (match) =>
          value ? match.slice(0, match.indexOf('/')) + encoded : ''
        );
      } else {
        result = result.split(placeholder).join(encoded);
      }
    }
    if (result !== source) writeFileSync(file, result);
  }

  function walk(path) {
    for (const item of readdirSync(path, { withFileTypes: true })) {
      const file = join(path, item.name);
      if (item.isDirectory()) walk(file);
      else if (item.isFile()) replace(file);
    }
  }

  walk(join(directory, '.next'));
  replace(join(directory, 'server.js'));
}

module.exports = { replaceFrontendEnvironment };
if (require.main === module) {
  replaceFrontendEnvironment(process.argv[2], process.env);
  console.log('Frontend runtime configuration applied');
}
