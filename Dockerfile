# Stage 1: web build (Vite + React)
FROM node:22-alpine AS build
WORKDIR /app

# Set these in Coolify as build-time variables (Vite bakes them into the site)
ARG VITE_API_URL
ARG VITE_PUBLIC_URL
ARG VITE_SUPPORT_EMAIL=info@ykdigitalsolutions.com
ARG VITE_SUPPORT_WHATSAPP=+34678708084

COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .

# Stops the build if VITE_API_URL is missing, otherwise the site would call localhost
RUN test -n "$VITE_API_URL" && npm run build

# Stage 2: Nginx
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
