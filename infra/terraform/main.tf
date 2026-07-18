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
}