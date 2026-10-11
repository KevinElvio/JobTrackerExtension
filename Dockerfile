# FROM node:20-alpine AS frontend-build
# WORKDIR /frontend
# COPY frontend/package.json frontend/package-lock.json ./
# RUN npm ci
# COPY frontend/ ./
# RUN npm run build

# FROM node:20-alpine
# WORKDIR /app
# COPY backend/package.json ./
# RUN npm install --omit=dev
# COPY backend/ ./
# COPY --from=frontend-build /frontend/dist ./public
# EXPOSE 8000
# CMD ["node", "server.js"]


# Build Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Production Server
FROM node:20-alpine

# Informasi Metadata Image (Nama & Versi)
LABEL name="Job-Tracker"
LABEL version="1.1.0"
LABEL description="Fullstack Application with React and Express"

WORKDIR /app
COPY backend/package.json ./
RUN npm install --omit=dev
COPY backend/ ./
COPY --from=frontend-build /frontend/dist ./public

EXPOSE 8000
CMD ["node", "server.js"]