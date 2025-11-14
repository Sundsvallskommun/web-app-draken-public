const { existsSync } = require('node:fs');

function getEnvArg() {
  const env = process.argv[2];
  if (!env) {
    console.error('Usage: must provide <env>');
    process.exit(1);
  }

  if (!/^[a-z]{1,4}$/.test(env)) {
    console.error('Error: <env> must be 1–4 lowercase letters.');
    process.exit(1);
  }

  const envFile = `.env.${env}`;
  if (!existsSync(envFile)) {
    console.error(`Error: ${envFile} does not exist.`);
    process.exit(1);
  }

  return { env, envFile };
}

module.exports = { getEnvArg };
