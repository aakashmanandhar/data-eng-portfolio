#!/bin/bash
echo "Checking if Docker is running..."

if ! docker info > /dev/null 2>&1; then
  echo "Docker Desktop is not running. Starting it now..."
  open -a Docker

  echo "Waiting for Docker to be ready (this can take up to a minute)..."
  attempts=0
  until docker info > /dev/null 2>&1; do
    sleep 2
    attempts=$((attempts + 1))
    if [ $attempts -ge 30 ]; then
      echo "Docker did not start within 60 seconds. Please check Docker Desktop and try again."
      exit 1
    fi
  done
  echo "Docker is ready."
fi

echo "Starting Data Engineering Portfolio..."
docker start portfolio_postgres portfolio_jenkins portfolio_django portfolio_react portfolio_dbt

echo ""
echo "Waiting for containers to settle..."
sleep 3

echo ""
echo "Status:"
docker ps --filter "name=portfolio_" --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "Site:          http://localhost:5173"
echo "Django admin:  http://localhost:8000/admin"
echo "Jenkins:       http://localhost:8080"

echo ""
echo "Opening site in browser..."
open http://localhost:5173