FROM node:24.22.2-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run prisma:generate
RUN npm run video-processing:build

FROM node:24.22.2-slim AS runner
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg postgresql-client \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/integrations/video-processing/dist ./integrations/video-processing/dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
CMD ["npm", "run", "video-processing:run"]
