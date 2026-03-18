#!/bin/sh
set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env file not found."
  echo "Copy .env.example to .env and fill in your credentials:"
  echo "  cp .env.example .env"
  exit 1
fi

. "$ENV_FILE"

if [ -z "$GHCR_USER" ] || [ -z "$GHCR_TOKEN" ]; then
  echo "Error: GHCR_USER or GHCR_TOKEN is not set in .env"
  exit 1
fi

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

docker compose -f "$SCRIPT_DIR/docker-compose.yml" pull
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d

echo "md-editor is running at http://$(hostname -I | awk '{print $1}'):5080"
