FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /dbt

RUN pip install --no-cache-dir dbt-postgres==1.9.0

COPY . .

CMD ["tail", "-f", "/dev/null"]