FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com \
 && npm config set fetch-retries 10 \
 && npm config set fetch-retry-mintimeout 60000 \
 && npm config set fetch-retry-maxtimeout 300000 \
 && npm config set maxsockets 1 \
 && npm ci --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
EXPOSE 3004
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
