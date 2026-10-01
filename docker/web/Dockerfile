FROM node:24-slim

WORKDIR /app

# A fresh named volume mounted here inherits this ownership; the container runs as node.
RUN mkdir -p /app/uploads && chown node:node /app/uploads

# Prisma's engines need OpenSSL, as in the production image.
RUN apt-get update \
 && apt-get install -y openssl \
 && rm -rf /var/lib/apt/lists/*

# compose starts this once the database accepts connections (the db healthcheck).
CMD ["sh", "-c", "npm run prisma:deploy && npm run prisma:generate && exec npm run dev"]