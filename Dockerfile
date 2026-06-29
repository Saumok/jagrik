# Jagrik on Cloud Run: one container serves the built SPA + the /api routes.
# Node 20 (matches package.json "engines"). tsx runs the TypeScript server
# directly (it's a runtime dependency), so there's no separate server compile.
FROM node:20-slim

WORKDIR /app

# Install deps first (better layer caching). Dev deps are needed for `vite build`.
COPY package*.json ./
RUN npm ci

# Copy the source and build the SPA into dist/ (server reads it in production).
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Cloud Run sets PORT (8080); server/env.ts reads process.env.PORT.
EXPOSE 8080

CMD ["npm", "run", "start"]
