FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

COPY . .
RUN npm run build

# Serve com nginx
FROM nginx:1.27-alpine

# Porta padrão para ambientes que não injetam PORT (ex.: docker-compose local).
# Plataformas/painéis podem sobrescrever via variável de ambiente.
ENV PORT=80

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80
