FROM node:24-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run mcp:build

FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/integrations/mcp/dist ./integrations/mcp/dist
COPY --from=builder /app/package*.json ./

EXPOSE 3490

CMD ["npm", "run", "mcp:run", "--", "--http"]
