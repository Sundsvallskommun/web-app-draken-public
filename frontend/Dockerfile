# Install dependencies only when needed
FROM registry.access.redhat.com/ubi9/nodejs-20 AS deps
WORKDIR /app
COPY --chown=1001:0 --chmod=444 package.json yarn.lock ./

RUN npm install -g yarn
RUN yarn install --frozen-lockfile

# Rebuild the source code only when needed
FROM registry.access.redhat.com/ubi9/nodejs-20 AS builder
WORKDIR /app
COPY --from=deps --chown=1001:0 --chmod=555 /app/node_modules ./node_modules
COPY --chown=1001:0 --chmod=555 . .
COPY --chown=1001:0 --chmod=444 .env-cicd .env.local

ENV NEXT_TELEMETRY_DISABLED 1
RUN npm install -g yarn
RUN yarn build
# Remove all the development dependencies since we don't
# need them to run the actual server.
RUN rm -rf node_modules
RUN yarn install --production --frozen-lockfile --ignore-scripts --prefer-offline

# Production image, copy all the files and run next
FROM registry.access.redhat.com/ubi9/nodejs-20 AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder --chown=1001:0 --chmod=444 /app/next.config.js ./
COPY --from=builder --chown=1001:0 --chmod=555 /app/public ./public
COPY --from=builder --chown=1001:0 --chmod=444 /app/package.json ./package.json

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=1001:0 --chmod=555 /app/.next/standalone ./
COPY --from=builder --chown=1001:0 --chmod=555 /app/.next/static ./.next/static

# Make .next directory group-writable for OpenShift
RUN chmod -R g+w /app/.next

# Copy entrypoint script
COPY --chown=1001:0 --chmod=555 entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh

# Use entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]