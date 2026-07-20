#!/bin/bash
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