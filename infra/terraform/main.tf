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

resource "docker_volume" "jenkins_home" {
  name = "portfolio_jenkins_home"
}

resource "docker_image" "jenkins" {
  name = "jenkins/jenkins:lts-jdk17"
}

resource "docker_container" "jenkins" {
  name  = "portfolio_jenkins"
  image = docker_image.jenkins.image_id

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
}

resource "docker_image" "django" {
  name = "portfolio-django:latest"
  build {
    context = "../../apps/api"
  }
}

resource "docker_container" "django" {
  name  = "portfolio_django"
  image = docker_image.django.image_id

  networks_advanced {
    name = docker_network.portfolio_net.name
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