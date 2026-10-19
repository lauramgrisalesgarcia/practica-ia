# Imagen del frontend: compila la SPA con Vite y la sirve con Caddy (que también reenvía /api a la API).
# VITE_API_URL se incrusta en el bundle al compilar; /api hace que el navegador llame al mismo origen.
FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM caddy:2
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
