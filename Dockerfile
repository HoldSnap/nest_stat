# ─── Этап сборки ────────────────────────────────────────────────────────────────
FROM node:23-slim AS builder
WORKDIR /app

# 1) Устанавливаем OpenSSL до работы с Prisma
RUN apt-get update -y \
 && apt-get install -y openssl \
 && rm -rf /var/lib/apt/lists/*

# 2) Копируем package.json и ставим зависимости
COPY package.json package-lock.json ./
RUN npm ci

# 3) Копируем папку prisma со схемой и миграциями
COPY prisma ./prisma

# 4) Генерируем клиент на основе схемы
RUN npx prisma generate --schema=./prisma/schema.prisma

# 5) Копируем исходники и ассеты
COPY tsconfig.json ./
COPY src ./src
COPY src/assets ./assets

# 6) Собираем приложение
RUN npm run build

# ─── Этап запуска ───
FROM node:23-slim AS runner
WORKDIR /app

# установить OpenSSL (для prisma)
RUN apt-get update -y \
 && apt-get install -y openssl \
 && rm -rf /var/lib/apt/lists/*

# копируем зависимости и билд
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# копируем prisma (схема + миграции)
COPY --from=builder /app/prisma ./prisma

# Ключевое: копируем папку src/assets из builder
COPY --from=builder /app/src/assets ./src/assets

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js"]
