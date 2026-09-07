# Build from the repository root. Changing dragon requires rebuilding the image.
FROM registry.access.redhat.com/ubi9/nodejs-22 AS builder
USER root
RUN mkdir -p /app/frontend && chown -R 1001:0 /app
USER 1001
WORKDIR /app/frontend
COPY --chown=1001:0 frontend/package.json frontend/yarn.lock ./
RUN npm install -g yarn@1.22.22 --ignore-scripts \
 && yarn install --frozen-lockfile --ignore-scripts
COPY --chown=1001:0 dragons.json /app/dragons.json
COPY --chown=1001:0 scripts/check-runtime-logging.mjs scripts/dragon.mjs scripts/dragon-deployment.cjs scripts/generate-deploy-info.js /app/scripts/
COPY --chown=1001:0 frontend/ ./
COPY --chown=1001:0 frontend/.env-cicd .env.local
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
ARG DRAKEN_BUILD_DRAGON
ARG DEPLOY_COMMIT
ARG DEPLOY_BRANCH=""
RUN node -e 'if (!/^[a-f0-9]{40}$/.test(process.env.DEPLOY_COMMIT || "")) \
    throw new Error("DEPLOY_COMMIT must be a full commit SHA")' \
 && yarn build \
 && cp .next/dragon-build.json /app/dragon-build.json

FROM registry.access.redhat.com/ubi9/nodejs-22 AS runner
ARG DRAKEN_BUILD_DRAGON
ARG DEPLOY_COMMIT
LABEL se.sundsvall.draken.id=$DRAKEN_BUILD_DRAGON \
      se.sundsvall.draken.service=frontend \
      org.opencontainers.image.revision=$DEPLOY_COMMIT
USER root
WORKDIR /app/frontend
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Next traces from the repository root, preserving frontend/server.js.
COPY --from=builder --chown=0:0 /app/frontend/.next/standalone /app/
COPY --from=builder --chown=0:0 /app/frontend/public ./public
COPY --from=builder --chown=0:0 /app/frontend/.next/static ./.next/static
COPY --from=builder --chown=0:0 /app/dragon-build.json /app/dragon-build.json
COPY --chown=0:0 dragons.json /app/dragons.json
COPY --chown=0:0 scripts/assert-dragon-image.cjs /app/scripts/assert-dragon-image.cjs
COPY --chown=0:0 scripts/replace-frontend-env.cjs /app/scripts/replace-frontend-env.cjs
COPY --chown=0:0 scripts/dragon-deployment.cjs scripts/start-dragon.cjs /app/scripts/
COPY --chown=0:0 frontend/entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' entrypoint.sh && chmod 0555 entrypoint.sh \
 && chown 1001:0 server.js && chmod g+w server.js \
 && chown -R 1001:0 .next && chmod -R g+w .next
USER 1001
EXPOSE 3000
ENTRYPOINT ["/app/frontend/entrypoint.sh"]
