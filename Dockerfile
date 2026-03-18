# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --prefer-offline

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV PORT=5080
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY server.mjs ./

EXPOSE 5080

CMD ["node", "server.mjs"]
