#!/bin/sh
set -eu
node /app/scripts/assert-dragon-image.cjs frontend
node /app/scripts/replace-frontend-env.cjs /app/frontend
exec node /app/frontend/server.js
