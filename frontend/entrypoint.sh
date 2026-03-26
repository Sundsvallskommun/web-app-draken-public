#!/bin/sh
# entrypoint.sh

replace_env_var() {
  local placeholder=$1
  local value=$2

  if [ "$value" = "__UNSET__" ]; then
    echo "Warning: ${placeholder} has no value, skipping..."
  else
    echo "Replacing ${placeholder} with ${value}..."
    find /app/.next -type f -name "*.js" -exec sed -i \
      "s|${placeholder}|${value}|g" {} +
  fi
}

inject_next_public_env() {
  echo "Injecting NEXT_PUBLIC_* env vars into globalThis.__ENV__..."
  local env_file="/app/runtime-env.js"

  printf 'globalThis.__ENV__ = {\n' > "$env_file"
  env | grep '^NEXT_PUBLIC_' | while IFS='=' read -r name value; do
    escaped=$(printf '%s' "$value" | sed 's|\\|\\\\|g; s|"|\\"|g')
    printf '  "%s": "%s",\n' "$name" "$escaped" >> "$env_file"
  done
  printf '};\n' >> "$env_file"

  # Prepend a require() of the env file to server.js
  local tmp=$(mktemp)
  printf 'require("/app/runtime-env.js");\n' | cat - /app/server.js > "$tmp" && mv "$tmp" /app/server.js
}

echo "Replacing runtime environment variables..."
echo "Running as user: $(id)"
ls -al /app/.next
ls -al /app/.next/server

# Explicit placeholder replacements
replace_env_var "DOMAIN_NAME_PLACEHOLDER" "${DOMAIN_NAME:-__UNSET__}"
replace_env_var "BASE_PATH_PLACEHOLDER" "${BASE_PATH:-__UNSET__}"
replace_env_var "NEXT_PUBLIC_BASEPATH_PLACEHOLDER" "${NEXT_PUBLIC_BASEPATH:-__UNSET__}"
replace_env_var "ADMIN_URL_PLACEHOLDER" "${ADMIN_URL:-__UNSET__}"
replace_env_var "NEXT_PUBLIC_PROTECTED_ROUTES_PLACEHOLDER" "${NEXT_PUBLIC_PROTECTED_ROUTES:-__UNSET__}"
replace_env_var "HEALTH_USERNAME_PLACEHOLDER" "${HEALTH_USERNAME:-__UNSET__}"
replace_env_var "HEALTH_PASSWORD_PLACEHOLDER" "${HEALTH_PASSWORD:-__UNSET__}"

inject_next_public_env

echo "Starting Next.js..."
exec node server.js