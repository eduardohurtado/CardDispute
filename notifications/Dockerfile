FROM node:22.22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM base AS prod
EXPOSE 3000
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
CMD ["pnpm", "start:prod"]