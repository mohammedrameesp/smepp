.PHONY: up down logs db ps clean help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-10s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Start all services
	docker compose up -d

down: ## Stop all services
	docker compose down

logs: ## Show logs for all services
	docker compose logs -f

db: ## Connect to PostgreSQL database
	docker compose exec postgres psql -U postgres -d damp

ps: ## Show running containers
	docker compose ps

clean: ## Remove all containers and volumes
	docker compose down -v --remove-orphans
	docker compose rm -f