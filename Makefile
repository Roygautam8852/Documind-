.PHONY: help dev down logs backend-shell backend-test frontend-test lint migrate build

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start all services with Docker Compose
	docker compose up --build

down: ## Stop all Docker Compose services
	docker compose down

logs: ## Tail Docker Compose logs
	docker compose logs -f

backend-shell: ## Open a shell in the backend container
	docker compose exec backend bash

backend-test: ## Run backend tests
	cd backend && python -m pytest tests/ -v

frontend-test: ## Run frontend tests
	cd frontend && npm run test

lint: ## Run all linters
	cd backend && ruff check app/ tests/
	cd backend && ruff format --check app/ tests/
	cd frontend && npm run lint

lint-fix: ## Auto-fix lint issues
	cd backend && ruff check --fix app/ tests/
	cd backend && ruff format app/ tests/
	cd frontend && npm run lint:fix

migrate: ## Run database migrations
	cd backend && alembic upgrade head

migrate-create: ## Create a new migration (usage: make migrate-create MSG="your message")
	cd backend && alembic revision --autogenerate -m "$(MSG)"

build: ## Build Docker images
	docker compose build

setup: ## Set up local development environment
	cp -n .env.example .env || true
	cd backend && cp -n .env.example .env || true
	cd backend && python -m venv .venv && .venv/bin/pip install -e ".[dev]"
	cd frontend && npm install

clean: ## Remove generated files and caches
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	cd frontend && rm -rf node_modules dist 2>/dev/null || true
