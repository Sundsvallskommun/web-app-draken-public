# Build from the repository root with an explicit dragon.
FROM node:22-slim AS builder
WORKDIR /app/backend
COPY backend/package.json backend/yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts
COPY dragons.json /app/dragons.json
COPY scripts/check-runtime-logging.mjs /app/scripts/check-runtime-logging.mjs
COPY scripts/dragon.mjs /app/scripts/dragon.mjs
COPY scripts/check-backend-artifact.mjs /app/scripts/check-backend-artifact.mjs
COPY scripts/dragon-deployment.cjs scripts/dragon-deployment.d.cts /app/scripts/
COPY backend/ ./
ARG DRAKEN_BUILD_DRAGON
ARG DEPLOY_COMMIT
RUN node ../scripts/dragon.mjs build "$DRAKEN_BUILD_DRAGON" backend \
 && mv "dist-$DRAKEN_BUILD_DRAGON" dist \
 && node -e 'require("fs").writeFileSync("dist/server.js", `require("./dragons/${process.env.DRAKEN_BUILD_DRAGON.toLowerCase()}/server.js");\n`)'

FROM node:22-slim AS production-deps
WORKDIR /app/backend
COPY backend/package.json backend/yarn.lock ./
RUN yarn install --production --frozen-lockfile --ignore-scripts

FROM node:22-slim AS runner
ARG DRAKEN_BUILD_DRAGON
ARG DEPLOY_COMMIT
LABEL se.sundsvall.draken.id=$DRAKEN_BUILD_DRAGON \
      se.sundsvall.draken.service=backend \
      org.opencontainers.image.revision=$DEPLOY_COMMIT
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodejs
COPY --from=production-deps /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/dist/dragon-build.json /app/dragon-build.json
COPY dragons.json /app/dragons.json
COPY scripts/assert-dragon-image.cjs /app/scripts/assert-dragon-image.cjs
COPY scripts/dragon-deployment.cjs scripts/start-dragon.cjs scripts/replace-frontend-env.cjs /app/scripts/
RUN mkdir -p data/sessions data/logs data/database && chown -R nodejs:nodejs data
USER nodejs
EXPOSE 3000
CMD ["node", "/app/scripts/start-dragon.cjs", "backend"]
