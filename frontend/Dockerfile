# =====================
# Dependencies
# =====================
FROM registry.access.redhat.com/ubi9/nodejs-20 AS deps

WORKDIR /app
COPY --chown=1001:0 package.json yarn.lock ./

# Read-only manifests (Sonar-safe)
RUN chmod 0444 package.json yarn.lock

RUN npm install -g yarn \
 && yarn install --frozen-lockfile

# =====================
# Build
# =====================
FROM registry.access.redhat.com/ubi9/nodejs-20 AS builder

WORKDIR /app
COPY --from=deps --chown=1001:0 /app/node_modules ./node_modules
COPY --chown=1001:0 . .
RUN chmod 0444 package.json yarn.lock next.config.js || true
COPY --chown=1001:0 .env-cicd .env.local
RUN chmod 0444 .env-cicd .env.local

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm install -g yarn \
 && yarn build

# Reduce image size
RUN rm -rf node_modules \
 && yarn install --production --frozen-lockfile --ignore-scripts --prefer-offline

# =====================
# Runtime
# =====================
FROM registry.access.redhat.com/ubi9/nodejs-20 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

# Next standalone output
COPY --from=builder --chown=1001:0 /app/.next/standalone ./
COPY --from=builder --chown=1001:0 /app/.next/static ./.next/static

# Make .next directory group-writable for OpenShift
RUN chmod -R g+w /app/.next

# Entrypoint
COPY --chown=1001:0 entrypoint.sh ./
RUN chmod 0555 entrypoint.sh \
 && sed -i 's/\r$//' ./entrypoint.sh

USER 1001

ENTRYPOINT ["/app/entrypoint.sh"]
