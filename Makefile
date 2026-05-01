.PHONY: setup up down logs restart build

setup:
	python scripts/setup.py

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
