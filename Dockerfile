# Packages the server — and the Angular client's already-built static files — into a
# single runtime image. This Dockerfile is fully self-contained to this directory;
# it does NOT build the Angular client itself.
#
# Before building this image, the client must already be built and copied into
# src/dist/my-blog-client/browser (the same thing app.js expects locally). Run from
# personal-blog-client/:
#   npm run build-move

# ---- Stage 1: install production dependencies ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- Stage 2: final runtime image ----
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["node", "src/server.js"]
