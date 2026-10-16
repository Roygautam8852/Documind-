FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for PyMuPDF and other native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmupdf-dev \
    libfreetype6-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency specification first for layer caching
COPY pyproject.toml .
COPY app ./app

# Install Python dependencies
RUN pip install --no-cache-dir -e "."

# Copy application source
COPY . .

RUN addgroup --system --gid 10001 documind \
    && adduser --system --uid 10001 --ingroup documind --home /app documind \
    && mkdir -p /app/data \
    && chown -R documind:documind /app/data

USER 10001:10001

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
