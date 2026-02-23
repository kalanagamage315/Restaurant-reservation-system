# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm ci

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Prisma + build
RUN npx prisma generate
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma

EXPOSE 3002

# migrate then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
