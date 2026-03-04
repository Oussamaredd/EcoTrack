# syntax=docker/dockerfile:1

# Step 1: Build React app from the monorepo root so app scripts can access
# shared workspace dependencies and infrastructure preload helpers.
FROM node:22-alpine AS deps
WORKDIR /workspace

COPY package*.json ./
COPY app/package*.json ./app/
COPY api/package*.json ./api/
COPY database/package*.json ./database/
COPY infrastructure/package*.json ./infrastructure/

RUN npm ci

FROM deps AS build
WORKDIR /workspace
COPY . .

WORKDIR /workspace/app
RUN npm run build

# Step 2: Serve app with Nginx
FROM nginx:alpine
COPY --from=build /workspace/app/dist /usr/share/nginx/html
COPY app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
