# --- Stage 1: Frontend Build ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Backend Build ---
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# --- Stage 3: Final Production ---
FROM node:20-alpine
WORKDIR /app

# Instalar utilidades para backups
RUN apk add --no-cache postgresql-client

# Copiar artefactos del frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copiar artefactos del backend
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/prisma ./backend/prisma

# Exponer el puerto del API (que ahora sirve el frontend)
EXPOSE 3001

# Comando de inicio: Migrar DB y correr servidor
WORKDIR /app/backend
CMD npx prisma migrate deploy && node dist/index.js
