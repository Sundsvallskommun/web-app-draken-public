# Install dependencies only when needed
FROM registry.access.redhat.com/ubi9/nodejs-20 AS deps

WORKDIR /app
COPY package.json yarn.lock ./

RUN npm install -g yarn
RUN yarn install --frozen-lockfile

# Rebuild the source code only when needed
FROM registry.access.redhat.com/ubi9/nodejs-20 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm install -g yarn
RUN yarn build

# Production image, copy all the files and run next
FROM registry.access.redhat.com/ubi9/nodejs-20 AS runner

WORKDIR /app

ENV NODE_ENV production

COPY --from=builder --chown=1001:0 --chmod=555 /app/ ./

# Create directories that need to be writable and set group permissions
RUN mkdir -p /app/data/sessions /app/data/logs/error && \
    chgrp -R 0 /app/data && \
    chmod -R g=u /app/data

EXPOSE 3000
ENV PORT 3000

CMD ["node", "./dist/server.js"]