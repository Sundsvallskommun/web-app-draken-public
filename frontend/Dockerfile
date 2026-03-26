# =====================
# Dependencies
# =====================
FROM registry.access.redhat.com/ubi9/nodejs-20 AS deps

RUN echo "Dependencies step"
WORKDIR /app
COPY package.json yarn.lock ./

USER root
RUN mkdir -p /app/node_modules && chown -R 1001:0 /app/node_modules
USER 1001

RUN npm install -g yarn \
 && yarn install --frozen-lockfile

# =====================
# Build
# =====================
FROM registry.access.redhat.com/ubi9/nodejs-20 AS builder

RUN echo "Build step"
USER root
RUN mkdir -p /app && chown -R 1001:0 /app
USER 1001
WORKDIR /app
COPY --from=deps --chown=1001:0 /app/node_modules ./node_modules
COPY --chown=1001:0 . .
COPY --chown=1001:0 .env-cicd .env.local

ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true

RUN npm install -g yarn \
 && yarn build

# Reduce image size
RUN rm -rf node_modules \
 && yarn install --production --frozen-lockfile --ignore-scripts --prefer-offline

# =====================
# Runtime
# =====================
FROM registry.access.redhat.com/ubi9/nodejs-20 AS runner

RUN echo "Runtime step"
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy everything as root-owned and read-only
COPY --from=builder --chown=0:0 --chmod=555 /app/next.config.js ./
COPY --from=builder --chown=0:0 --chmod=555 /app/public ./public
COPY --from=builder --chown=0:0 --chmod=444 /app/package.json ./
COPY --from=builder --chown=0:0 --chmod=555 /app/.next/standalone ./
COPY --from=builder --chown=0:0 --chmod=555 /app/.next/static ./.next/static

# Grant write only where OpenShift needs it
USER root
RUN chown -R 1001:0 /app/.next && chmod -R g+w /app/.next
USER 1001

# Entrypoint — fix line endings before locking permissions
COPY --chown=0:0 entrypoint.sh ./
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod 0555 ./entrypoint.sh

USER 1001

ENTRYPOINT ["/app/entrypoint.sh"]
