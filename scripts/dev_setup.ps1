# DocuMind — Windows Development Setup Script
# Run from the repository root: .\scripts\dev_setup.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== DocuMind Dev Setup (Windows) ===" -ForegroundColor Cyan

# --- Check prerequisites ---
Write-Host "`n[1/5] Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python 3.11+ is required. Install from https://python.org"
    exit 1
}

$pyVersion = python --version 2>&1
Write-Host "  Python: $pyVersion" -ForegroundColor Green

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js 20+ is required. Install from https://nodejs.org"
    exit 1
}

$nodeVersion = node --version 2>&1
Write-Host "  Node: $nodeVersion" -ForegroundColor Green

# --- Copy env files ---
Write-Host "`n[2/5] Setting up environment files..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "  Created .env from .env.example — PLEASE EDIT with your values" -ForegroundColor Cyan
} else {
    Write-Host "  .env already exists, skipping" -ForegroundColor Gray
}

if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "  Created backend\.env" -ForegroundColor Green
} else {
    Write-Host "  backend\.env already exists, skipping" -ForegroundColor Gray
}

# --- Backend setup ---
Write-Host "`n[3/5] Setting up Python backend..." -ForegroundColor Yellow

Set-Location backend

if (-not (Test-Path ".venv")) {
    python -m venv .venv
    Write-Host "  Created virtual environment" -ForegroundColor Green
}

.\.venv\Scripts\pip install -e ".[dev]" --quiet
Write-Host "  Installed backend dependencies" -ForegroundColor Green

Set-Location ..

# --- Frontend setup ---
Write-Host "`n[4/5] Installing frontend dependencies..." -ForegroundColor Yellow

Set-Location frontend
npm install --silent
Write-Host "  Installed frontend dependencies" -ForegroundColor Green
Set-Location ..

# --- Create data directories ---
Write-Host "`n[5/5] Creating data directories..." -ForegroundColor Yellow

@("data\uploads", "data\chroma", "data\logs") | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ | Out-Null
        Write-Host "  Created $_" -ForegroundColor Green
    }
}

Write-Host "`n=== Setup complete! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Edit .env and backend\.env with your configuration" -ForegroundColor Gray
Write-Host "  2. Start PostgreSQL (or use: docker compose up postgres -d)" -ForegroundColor Gray
Write-Host "  3. Run migrations:  cd backend && .\.venv\Scripts\alembic upgrade head" -ForegroundColor Gray
Write-Host "  4. Start backend:   cd backend && .\.venv\Scripts\uvicorn app.main:app --reload" -ForegroundColor Gray
Write-Host "  5. Start frontend:  cd frontend && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Or use Docker Compose: docker compose up --build" -ForegroundColor Cyan
