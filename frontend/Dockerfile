# =====================
# Build
# =====================
FROM registry.access.redhat.com/ubi9/nodejs-22 AS builder

USER root
RUN mkdir -p /app && chown -R 1001:0 /app
USER 1001
WORKDIR /app

COPY --chown=1001:0 package.json yarn.lock ./
RUN npm install -g yarn \
 && yarn install --frozen-lockfile

COPY --chown=1001:0 . .
COPY --chown=1001:0 .env-cicd .env.local

# Optional deploy info from CI pipeline (Tekton)
ARG DEPLOY_COMMIT=""
ARG DEPLOY_BRANCH=""

RUN if [ -n "$DEPLOY_COMMIT" ]; then \
  printf '{\n  "commit": "%s",\n  "branch": "%s",\n  "updatedAt": "%s"\n}' \
    "$DEPLOY_COMMIT" "$DEPLOY_BRANCH" "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" \
  > public/deploy-info.json && echo "Generated deploy-info.json from build args"; \
fi

RUN yarn build

# =====================
# Runtime
# =====================
FROM registry.access.redhat.com/ubi9/nginx-124 AS runner

# Copy built static files
COPY --from=builder --chown=1001:0 /app/dist /opt/app-root/src

# Copy nginx config
COPY --chown=1001:0 nginx.conf /etc/nginx/nginx.conf

# Copy entrypoint script
COPY --chown=0:0 entrypoint.sh /opt/app-root/
RUN sed -i 's/\r$//' /opt/app-root/entrypoint.sh && chmod 0555 /opt/app-root/entrypoint.sh

# Grant write to static files for runtime env replacement
USER root
RUN chown -R 1001:0 /opt/app-root/src && chmod -R g+w /opt/app-root/src
USER 1001

EXPOSE 3000

ENTRYPOINT ["/opt/app-root/entrypoint.sh"]
