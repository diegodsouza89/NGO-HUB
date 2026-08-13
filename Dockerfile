FROM node:20-alpine AS builder
WORKDIR /app

# copy package files first for better caching
COPY package.json package-lock.json* tsconfig.json ./
COPY . .

RUN npm ci
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# copy built assets
COPY --from=builder /app/dist ./dist
COPY package.json package-lock.json* ./

# install only production deps
RUN npm ci --omit=dev

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
