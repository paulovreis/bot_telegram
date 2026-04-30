.PHONY: setup ssl up down logs restart build

setup:
	python scripts/setup.py

ssl:
	@echo "Gerando certificado SSL auto-assinado via Docker..."
	docker run --rm \
		-v "$(CURDIR)/nginx/ssl:/ssl" \
		alpine sh -c "apk add --no-cache openssl && \
		openssl req -x509 -nodes -days 3650 -newkey rsa:4096 \
		-keyout /ssl/key.pem -out /ssl/cert.pem \
		-subj '/C=BR/ST=SP/L=SaoPaulo/O=TelegramBot/CN=localhost'"
	@echo "Certificado gerado em nginx/ssl/"

build:
	docker compose build --no-cache

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

restart:
	docker compose restart

start: ssl up
	@echo "Sistema iniciado em https://localhost"
