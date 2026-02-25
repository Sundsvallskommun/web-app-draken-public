# Install dependencies only when needed
FROM registry.access.redhat.com/ubi9/nodejs-20 AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
# RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --chown=1001:0 package.json yarn.lock ./

RUN npm install -g yarn
RUN yarn install --frozen-lockfile
RUN id
RUN ls -al

# Rebuild the source code only when needed
FROM registry.access.redhat.com/ubi9/nodejs-20 AS builder
WORKDIR /app
COPY --from=deps --chown=1001:0 /app/node_modules ./node_modules
COPY --chown=1001:0 . .
COPY --chown=1001:0 .env-cicd .env.local
RUN id
RUN ls -al

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

# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Automatically leverage output traces to reduce image size 
# https://nextjs.org/docs/advanced-features/output-file-tracing
# COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=1001:0 /app/.next/standalone ./
COPY --from=builder --chown=1001:0 /app/.next/static ./.next/static

# Make .next directory group-writable for OpenShift
RUN chmod -R g+w /app/.next

RUN id

# Copy entrypoint script
COPY --chown=1001:0 entrypoint.sh ./entrypoint.sh
USER 0
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh
USER 1001
RUN pwd
RUN ls -al

# Use entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]

# EXPOSE 3000
# ENV PORT 3000

# CMD ["node", "server.js"]
