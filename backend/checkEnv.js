const { existsSync } = require('node:fs');

function getEnvArgDual() {
  const env = process.argv[2];
  if (!env) {
    console.error('Usage: must provide <env>');
    process.exit(1);
  }

  if (!/^[a-z]{1,4}$/.test(env)) {
    console.error('Error: <env> must be 1–4 lowercase letters.');
    process.exit(1);
  }

  const devFile = `.env.${env}.development.local`;
  const prodFile = `.env.${env}.production.local`;

  if (!existsSync(devFile) && !existsSync(prodFile)) {
    console.error(`Error: neither ${devFile} nor ${prodFile} exists.`);
    process.exit(1);
  }

  return { env, devFile, prodFile };
}

module.exports = { getEnvArgDual };
