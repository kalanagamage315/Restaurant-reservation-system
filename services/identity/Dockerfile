# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only manifests for caching
COPY package*.json ./

# Install dependencies (reliable on slow networks)
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm ci --legacy-peer-deps

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app

# Copy source
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Generate Prisma client + build NestJS
RUN npx prisma generate
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built app + prisma files + node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma

EXPOSE 3001

# Run DB migrations then start service
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
