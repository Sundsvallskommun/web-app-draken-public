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

echo "Replacing runtime environment variables..."
echo "Running as user: $(id)"
ls -al /app/.next
ls -al /app/.next/server

replace_env_var "NEXT_PUBLIC_APP_NAME_PLACEHOLDER" "${NEXT_PUBLIC_APP_NAME:-__UNSET__}"
replace_env_var "NEXT_PUBLIC_API_URL_PLACEHOLDER" "${NEXT_PUBLIC_API_URL:-__UNSET__}"
replace_env_var "DOMAIN_NAME_PLACEHOLDER" "${DOMAIN_NAME:-__UNSET__}"
replace_env_var "/BASE_PATH_PLACEHOLDER" "${BASE_PATH:-__UNSET__}"
replace_env_var "/NEXT_PUBLIC_BASE_PATH_PLACEHOLDER" "${NEXT_PUBLIC_BASE_PATH:-__UNSET__}"
replace_env_var "ADMIN_URL_PLACEHOLDER" "${ADMIN_URL:-__UNSET__}"
replace_env_var "NEXT_PUBLIC_PROTECTED_ROUTES_PLACEHOLDER" "${NEXT_PUBLIC_PROTECTED_ROUTES:-__UNSET__}"
replace_env_var "HEALTH_USERNAME_PLACEHOLDER" "${HEALTH_USERNAME:-__UNSET__}"
replace_env_var "HEALTH_PASSWORD_PLACEHOLDER" "${HEALTH_PASSWORD:-__UNSET__}"

echo "Starting Next.js..."
exec node server.js