FROM node:22-alpine AS builder

WORKDIR /app

COPY backend/package.json backend/tsconfig.json ./backend/
WORKDIR /app/backend
RUN npm install

WORKDIR /app
COPY frontend/package.json frontend/tsconfig.json ./frontend/
COPY site ./site
COPY backend/src ./backend/src
COPY backend/tests ./backend/tests
COPY frontend/src ./frontend/src

WORKDIR /app/backend
RUN npx tsc
RUN node --test dist/tests/*.test.js

WORKDIR /app/frontend
RUN ../backend/node_modules/.bin/tsc -p .

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/site ./site

EXPOSE 3000

WORKDIR /app/backend
CMD ["node", "dist/src/app.js"]
