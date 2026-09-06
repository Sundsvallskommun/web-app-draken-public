# Build from the repository root with an explicit dragon.
FROM node:22-slim AS builder
WORKDIR /app/backend
COPY backend/package.json backend/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY dragons.json /app/dragons.json
COPY scripts/dragon.mjs /app/scripts/dragon.mjs
COPY backend/ ./
ARG DRAKEN_BUILD_DRAGON
RUN node ../scripts/dragon.mjs build "$DRAKEN_BUILD_DRAGON" backend \
 && mv "dist-$DRAKEN_BUILD_DRAGON" dist \
 && node -e 'require("fs").writeFileSync("dist/server.js", `require("./dragons/${process.env.DRAKEN_BUILD_DRAGON.toLowerCase()}/server.js");\n`)'

FROM node:22-slim AS production-deps
WORKDIR /app/backend
COPY backend/package.json backend/yarn.lock ./
RUN yarn install --production --frozen-lockfile

FROM node:22-slim AS runner
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
RUN mkdir -p data/sessions data/logs data/database && chown -R nodejs:nodejs data
USER nodejs
EXPOSE 3000
CMD ["sh", "-c", "node /app/scripts/assert-dragon-image.cjs backend && exec node dist/server.js"]
