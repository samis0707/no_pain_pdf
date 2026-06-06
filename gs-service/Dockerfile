FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    ghostscript \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir .
COPY app/ ./app/

RUN useradd -m -u 1000 appuser
USER appuser

EXPOSE 3002
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3002"]
