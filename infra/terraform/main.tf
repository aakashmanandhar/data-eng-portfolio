terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

resource "docker_network" "portfolio_net" {
  name = "portfolio_net"
}

# --- Postgres (with pgvector) ---
resource "docker_volume" "pgdata" {
  name = "portfolio_pgdata"
}

resource "docker_image" "postgres" {
  name = "pgvector/pgvector:pg16"
}

resource "docker_container" "postgres" {
  name  = "portfolio_postgres"
  image = docker_image.postgres.image_id

  networks_advanced {
    name = docker_network.portfolio_net.name
  }

  env = [
    "POSTGRES_USER=postgres",
    "POSTGRES_PASSWORD=localdevpassword",
    "POSTGRES_DB=portfolio"
  ]

  ports {
    internal = 5432
    external = 5433
  }

  volumes {
    volume_name    = docker_volume.pgdata.name
    container_path = "/var/lib/postgresql/data"
  }

  volumes {
    host_path      = "${abspath(path.module)}/../postgres-init"
    container_path = "/docker-entrypoint-initdb.d"
  }
}

# --- Jenkins ---
resource "docker_volume" "jenkins_home" {
  name = "portfolio_jenkins_home"
}

resource "docker_image" "jenkins" {
  name         = "portfolio-jenkins:latest"
  keep_locally = true
}

resource "docker_container" "jenkins" {
  name  = "portfolio_jenkins"
  image = docker_image.jenkins.image_id
  user  = "root"

  networks_advanced {
    name = docker_network.portfolio_net.name
  }

  ports {
    internal = 8080
    external = 8080
  }

  ports {
    internal = 50000
    external = 50000
  }

  volumes {
    volume_name    = docker_volume.jenkins_home.name
    container_path = "/var/jenkins_home"
  }

  volumes {
    host_path      = "/var/run/docker.sock"
    container_path = "/var/run/docker.sock"
  }

  volumes {
    host_path      = "${abspath(path.module)}/../../.env"
    container_path = "/secrets/.env"
  }
}

# --- Django ---
resource "docker_image" "django" {
  name         = "portfolio-django:latest"
  keep_locally = true
}

resource "docker_container" "django" {
  name  = "portfolio_django"
  image = docker_image.django.image_id

  networks_advanced {
    name = docker_network.portfolio_net.name
  }

  volumes {
    host_path      = "${abspath(path.module)}/../../.env"
    container_path = "/secrets/.env"
  }

  env = [
    "POSTGRES_HOST=portfolio_postgres",
    "POSTGRES_PORT=5432",
    "POSTGRES_DB=portfolio",
    "POSTGRES_USER=postgres",
    "POSTGRES_PASSWORD=localdevpassword"
  ]

  ports {
    internal = 8000
    external = 8000
  }

  volumes {
    host_path      = "${abspath(path.module)}/../../apps/api"
    container_path = "/app"
  }

  depends_on = [docker_container.postgres]
}

resource "docker_image" "react_dev" {
  name = "node:20-slim"
}

resource "docker_container" "react" {
  name  = "portfolio_react"
  image = docker_image.react_dev.image_id

  networks_advanced {
    name = docker_network.portfolio_net.name
  }

  ports {
    internal = 5173
    external = 5173
  }

  volumes {
    host_path      = "${abspath(path.module)}/../../apps/web"
    container_path = "/app"
  }

  working_dir = "/app"
  command     = ["sh", "-c", "npm install && npm run dev -- --host 0.0.0.0"]
}

resource "docker_image" "dbt" {
  name         = "portfolio-dbt:latest"
  keep_locally = true
}

resource "docker_container" "dbt" {
  name  = "portfolio_dbt"
  image = docker_image.dbt.image_id

  networks_advanced {
    name = docker_network.portfolio_net.name
  }

  volumes {
    host_path      = "${abspath(path.module)}/../../pipeline/dbt"
    container_path = "/dbt"
  }

  depends_on = [docker_container.postgres]
}

# --- Airflow ---
resource "docker_volume" "airflow_logs" {
  name = "portfolio_airflow_logs"
}

resource "docker_image" "airflow" {
  name         = "portfolio-airflow:latest"
  keep_locally = true
}

resource "docker_container" "airflow" {
  name  = "portfolio_airflow"
  image = docker_image.airflow.image_id
  networks_advanced {
    name = docker_network.portfolio_net.name
  }
  env = [
    "AIRFLOW__DATABASE__SQL_ALCHEMY_CONN=postgresql+psycopg2://postgres:localdevpassword@portfolio_postgres:5432/airflow_meta",
    "AIRFLOW__CORE__EXECUTOR=LocalExecutor",
    "AIRFLOW__CORE__LOAD_EXAMPLES=False",
    "_AIRFLOW_WWW_USER_USERNAME=admin",
    "_AIRFLOW_WWW_USER_PASSWORD=localdevadmin"
  ]
  ports {
    internal = 8080
    external = 8081
  }
  volumes {
    host_path      = "${abspath(path.module)}/../../pipeline/airflow/dags"
    container_path = "/opt/airflow/dags"
  }
  volumes {
    volume_name    = docker_volume.airflow_logs.name
    container_path = "/opt/airflow/logs"
  }
  volumes {
    host_path      = "${abspath(path.module)}/../../.env"
    container_path = "/secrets/.env"
  }

 volumes {
    host_path      = "/var/run/docker.sock"
    container_path = "/var/run/docker.sock"
  }

  volumes {
    host_path      = "${abspath(path.module)}/../.."
    container_path = "/repo"
  }
  command    = ["standalone"]
  depends_on = [docker_container.postgres]
}