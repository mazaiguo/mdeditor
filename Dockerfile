# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV PORT=5080
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY server.mjs ./

RUN mkdir -p dist/images

EXPOSE 5080

CMD ["node", "server.mjs"]
