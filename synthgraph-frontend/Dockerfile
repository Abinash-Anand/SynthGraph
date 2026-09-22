# ---- deps: install once, reused by the build stage ----
# npm 10.x (bundled with node:22-alpine) fails resolving this tree's
# optional platform packages (e.g. the @emnapi/* WASM fallbacks pulled in
# by lightningcss/@tailwindcss/oxide); npm >=11 resolves it fine, so bump
# first — mirrors the same fix already applied to the backend Dockerfile.
FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install -g npm@11
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: produce the Next.js standalone output ----
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime: standalone server only, no node_modules/source needed ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# No /public directory exists yet; add this line back if one is introduced.
# COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
USER node

CMD ["node", "server.js"]
