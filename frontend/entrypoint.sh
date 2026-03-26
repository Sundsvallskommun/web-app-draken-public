#!/bin/sh
# entrypoint.sh
# Replaces build-time placeholders with runtime environment variables.
# Works with any NEXT_PUBLIC_* variable automatically.

replace_env_var() {
  local placeholder=$1
  local value=$2

  if [ "$value" = "__UNSET__" ]; then
    echo "Warning: ${placeholder} has no value, skipping..."
  else
    echo "Replacing ${placeholder} with ${value}..."
    find /app/.next -type f -name "*.js" -exec sed -i \
      "s|${placeholder}|${value}|g" {} +
    # Also replace in server.js (standalone root, outside .next/)
    sed -i "s|${placeholder}|${value}|g" /app/server.js 2>/dev/null || true
  fi
}

echo "Replacing runtime environment variables..."
echo "Running as user: $(id)"
ls -al /app/.next
ls -al /app/.next/server

# --- Non NEXT_PUBLIC vars (explicit placeholders) ---
replace_env_var "DOMAIN_NAME_PLACEHOLDER" "${DOMAIN_NAME:-__UNSET__}"
replace_env_var "BASE_PATH_PLACEHOLDER" "${BASE_PATH:-__UNSET__}"
replace_env_var "ADMIN_URL_PLACEHOLDER" "${ADMIN_URL:-__UNSET__}"
replace_env_var "HEALTH_USERNAME_PLACEHOLDER" "${HEALTH_USERNAME:-__UNSET__}"
replace_env_var "HEALTH_PASSWORD_PLACEHOLDER" "${HEALTH_PASSWORD:-__UNSET__}"

# --- All NEXT_PUBLIC_* vars (automatic) ---
# For each NEXT_PUBLIC_* env var, replace its _PLACEHOLDER with the real value.
# E.g. NEXT_PUBLIC_USE_BILLING=true replaces NEXT_PUBLIC_USE_BILLING_PLACEHOLDER -> true
echo "Replacing NEXT_PUBLIC_* placeholders..."
env | grep '^NEXT_PUBLIC_' | while IFS='=' read -r name value; do
  placeholder="${name}_PLACEHOLDER"
  replace_env_var "$placeholder" "$value"
done

echo "Starting Next.js..."
exec node server.js
