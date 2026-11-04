# syntax=docker/dockerfile:1
# Сборка из корня репозитория: docker build -f apps/api/Dockerfile .

FROM node:26-alpine AS build
RUN npm install -g pnpm@11.28.10
WORKDIR /repo

# Сначала только манифесты — слой с зависимостями кешируется, пока не меняется lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
RUN pnpm install --frozen-lockfile --filter "@nisha/api..."

COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN pnpm --filter @nisha/api build \
  && pnpm --filter @nisha/api deploy --prod --legacy /out \
  && cp -r apps/api/dist /out/dist

FROM node:26-alpine
ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "dist/server.js"]
