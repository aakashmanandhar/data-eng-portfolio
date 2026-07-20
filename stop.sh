#!/bin/bash
echo "Stopping Data Engineering Portfolio..."
docker stop portfolio_postgres portfolio_jenkins portfolio_django portfolio_react portfolio_dbt
echo "Stopped."