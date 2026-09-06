# Build from the repository root. Changing dragon requires rebuilding the image.
FROM registry.access.redhat.com/ubi9/nodejs-22 AS builder
USER root
RUN mkdir -p /app/frontend && chown -R 1001:0 /app
USER 1001
WORKDIR /app/frontend
COPY --chown=1001:0 frontend/package.json frontend/yarn.lock ./
RUN npm install -g yarn && yarn install --frozen-lockfile
COPY --chown=1001:0 dragons.json /app/dragons.json
COPY --chown=1001:0 frontend/ ./
COPY --chown=1001:0 frontend/.env-cicd .env.local
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
ARG DRAKEN_BUILD_DRAGON
ARG DEPLOY_COMMIT=""
ARG DEPLOY_BRANCH=""
RUN if [ -n "$DEPLOY_COMMIT" ]; then \
  node -e 'require("fs").writeFileSync("public/deploy-info.json", JSON.stringify({commit: process.env.DEPLOY_COMMIT, branch: process.env.DEPLOY_BRANCH, updatedAt: new Date().toISOString()}))'; \
  fi
RUN yarn build \
 && node -e 'require("fs").writeFileSync("/app/dragon-build.json", JSON.stringify({id: process.env.DRAKEN_BUILD_DRAGON}))'

FROM registry.access.redhat.com/ubi9/nodejs-22 AS runner
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
COPY --chown=0:0 frontend/entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' entrypoint.sh && chmod 0555 entrypoint.sh \
 && chown 1001:0 server.js && chmod g+w server.js \
 && chown -R 1001:0 .next && chmod -R g+w .next
USER 1001
EXPOSE 3000
ENTRYPOINT ["/app/frontend/entrypoint.sh"]
