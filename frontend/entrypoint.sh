#!/bin/sh
# entrypoint.sh
# Replaces build-time placeholders with runtime environment variables.

STATIC_DIR="/opt/app-root/src"

replace_in_dist() {
  local placeholder=$1
  local value=$2

  if [ "$value" = "__UNSET__" ]; then
    echo "Warning: ${placeholder} has no value, skipping..."
    return
  fi

  echo "Replacing ${placeholder} with ${value}..."

  # Replace in all JS and CSS files under dist
  find "$STATIC_DIR" -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" -o -name "*.json" \) \
    -exec sed -i "s|${placeholder}|${value}|g" {} +
}

echo "Replacing runtime environment variables..."
echo "Running as user: $(id)"

# --- Non VITE vars (explicit placeholders) ---
replace_in_dist "DOMAIN_NAME_PLACEHOLDER" "${DOMAIN_NAME:-__UNSET__}"
replace_in_dist "BASE_PATH_PLACEHOLDER" "${BASE_PATH:-__UNSET__}"
replace_in_dist "ADMIN_URL_PLACEHOLDER" "${ADMIN_URL:-__UNSET__}"

# --- All VITE_* vars (automatic) ---
echo "Replacing VITE_* placeholders..."
env | grep '^VITE_' | while IFS='=' read -r name value; do
  replace_in_dist "${name}_PLACEHOLDER" "$value"
done

# --- Replace backend URL in nginx config ---
if [ -n "$VITE_API_URL" ]; then
  echo "Setting backend proxy URL to ${VITE_API_URL}..."
  sed -i "s|BACKEND_URL_PLACEHOLDER|${VITE_API_URL}|g" /etc/nginx/nginx.conf
fi

echo "Starting nginx..."
exec nginx -g 'daemon off;'
