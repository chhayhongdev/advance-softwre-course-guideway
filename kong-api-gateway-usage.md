# Kong API Gateway Usage Guide

## Overview
This guide covers the usage of Kong API Gateway, a popular open-source API gateway and microservices management layer. Kong provides features like authentication, rate limiting, logging, and more through its plugin architecture.

## What is Kong?

Kong is a cloud-native, fast, scalable, and distributed API gateway built on top of Nginx and the lua-nginx-module (specifically OpenResty). It provides a flexible abstraction layer for microservices and APIs.

### Key Features
- **Plugin Architecture**: Extensible through Lua plugins
- **Scalability**: Built on Nginx for high performance
- **Cloud-Native**: Container-ready and Kubernetes-friendly
- **Multi-Protocol**: Supports HTTP, HTTPS, HTTP/2, TCP, UDP, and gRPC
- **Database Backends**: PostgreSQL, Cassandra, or in-memory for development
- **Admin API**: RESTful API for configuration management
- **Kong Manager**: Web-based GUI for management
- **Kong Gateway**: The runtime data plane

## Installation and Setup

### Docker Installation (Recommended for Development)
```bash
# Run Kong with PostgreSQL
docker network create kong-net

# Start PostgreSQL
docker run -d --name kong-database \
  --network=kong-net \
  -p 5432:5432 \
  -e "POSTGRES_DB=kong" \
  -e "POSTGRES_USER=kong" \
  -e "POSTGRES_PASSWORD=kongpass" \
  postgres:13

# Run Kong migrations
docker run --rm --network=kong-net \
  -e "KONG_DATABASE=postgres" \
  -e "KONG_PG_HOST=kong-database" \
  -e "KONG_PG_PASSWORD=kongpass" \
  kong/kong-gateway:3.4 \
  kong migrations bootstrap

# Start Kong Gateway
docker run -d --name kong-gateway \
  --network=kong-net \
  -e "KONG_DATABASE=postgres" \
  -e "KONG_PG_HOST=kong-database" \
  -e "KONG_PG_PASSWORD=kongpass" \
  -e "KONG_PROXY_ACCESS_LOG=/dev/stdout" \
  -e "KONG_ADMIN_ACCESS_LOG=/dev/stdout" \
  -e "KONG_PROXY_ERROR_LOG=/dev/stderr" \
  -e "KONG_ADMIN_ERROR_LOG=/dev/stderr" \
  -e "KONG_ADMIN_LISTEN=0.0.0.0:8001" \
  -p 8000:8000 \
  -p 8443:8443 \
  -p 8001:8001 \
  -p 8444:8444 \
  kong/kong-gateway:3.4
```

### Kubernetes Installation with Helm
```bash
# Add Kong Helm repository
helm repo add kong https://charts.konghq.com
helm repo update

# Install Kong with PostgreSQL
helm install kong kong/kong \
  --set env.database=postgres \
  --set env.pg_host=postgresql.default.svc.cluster.local \
  --set env.pg_database=kong \
  --set env.pg_user=kong \
  --set env.pg_password=kongpass \
  --set proxy.http.enabled=true \
  --set proxy.http.servicePort=80 \
  --set proxy.http.containerPort=8000 \
  --set admin.http.enabled=true \
  --set admin.http.servicePort=8001 \
  --set admin.http.containerPort=8001
```

## Kong Architecture

### Components
1. **Kong Gateway (Data Plane)**: The runtime component that proxies requests
2. **Kong Manager**: Web-based administrative interface
3. **Kong Admin API**: RESTful API for configuration
4. **Kong Dev Portal**: Developer portal for API documentation
5. **Kong Konnect**: Cloud-based control plane for multi-cluster management

### Ports
- **8000**: Proxy port (HTTP)
- **8443**: Proxy port (HTTPS)
- **8001**: Admin API port (HTTP)
- **8444**: Admin API port (HTTPS)
- **8002**: Dev Portal (HTTP)
- **8445**: Dev Portal (HTTPS)
- **8003**: Manager (HTTP)
- **8446**: Manager (HTTPS)

## Core Concepts

### Services
A Service represents an upstream API or microservice that Kong proxies requests to.

```bash
# Create a service
curl -X POST http://localhost:8001/services \
  --data "name=product-service" \
  --data "url=http://product-service:8080"
```

### Routes
Routes define rules for matching client requests to Services.

```bash
# Create a route for the service
curl -X POST http://localhost:8001/services/product-service/routes \
  --data "paths[]=/api/products" \
  --data "methods[]=GET" \
  --data "methods[]=POST"
```

### Upstreams and Targets
Upstreams define a virtual hostname and Targets define the backend servers.

```bash
# Create an upstream
curl -X POST http://localhost:8001/upstreams \
  --data "name=product-service-upstream"

# Add targets to upstream
curl -X POST http://localhost:8001/upstreams/product-service-upstream/targets \
  --data "target=product-service-1:8080" \
  --data "weight=100"

curl -X POST http://localhost:8001/upstreams/product-service-upstream/targets \
  --data "target=product-service-2:8080" \
  --data "weight=100"
```

## Plugins

Kong's functionality is extended through plugins. Plugins can be global or scoped to services/routes.

### Essential Plugins

#### Authentication Plugins
```bash
# Key Authentication
curl -X POST http://localhost:8001/plugins \
  --data "name=key-auth" \
  --data "service.name=product-service"

# JWT Authentication
curl -X POST http://localhost:8001/plugins \
  --data "name=jwt" \
  --data "service.name=product-service"

# Basic Authentication
curl -X POST http://localhost:8001/plugins \
  --data "name=basic-auth" \
  --data "service.name=product-service"
```

#### Rate Limiting
```bash
# Rate Limiting
curl -X POST http://localhost:8001/plugins \
  --data "name=rate-limiting" \
  --data "service.name=product-service" \
  --data "config.minute=100" \
  --data "config.hour=1000"
```

#### Request/Response Transformation
```bash
# Request Transformer
curl -X POST http://localhost:8001/plugins \
  --data "name=request-transformer" \
  --data "service.name=product-service" \
  --data "config.add.headers=X-Forwarded-Host:example.com"
```

#### CORS
```bash
# CORS Plugin
curl -X POST http://localhost:8001/plugins \
  --data "name=cors" \
  --data "service.name=product-service"
```

#### Logging
```bash
# HTTP Log Plugin
curl -X POST http://localhost:8001/plugins \
  --data "name=http-log" \
  --data "service.name=product-service" \
  --data "config.http_endpoint=http://log-service:8080/logs" \
  --data "config.method=POST"
```

## Kong Manager (Web UI)

Kong Manager provides a web-based interface for managing Kong Gateway.

### Accessing Kong Manager
- URL: http://localhost:8002 (default)
- Default credentials: admin/admin (for DB-less mode)

### Features
- **Services & Routes**: Create and manage services and routes
- **Plugins**: Configure plugins through UI
- **Certificates**: Manage SSL certificates
- **Consumers**: Manage API consumers
- **Upstreams**: Configure load balancing
- **Analytics**: View traffic analytics

## Kong Admin API

The Admin API provides RESTful endpoints for programmatic configuration.

### Common Endpoints

#### Services
```bash
# List services
curl http://localhost:8001/services

# Get service details
curl http://localhost:8001/services/{service_id}

# Update service
curl -X PATCH http://localhost:8001/services/{service_id} \
  --data "url=http://new-backend:8080"

# Delete service
curl -X DELETE http://localhost:8001/services/{service_id}
```

#### Routes
```bash
# List routes for a service
curl http://localhost:8001/services/{service_id}/routes

# Create route
curl -X POST http://localhost:8001/routes \
  --data "service.name=product-service" \
  --data "paths[]=/api/v1/products"

# Update route
curl -X PATCH http://localhost:8001/routes/{route_id} \
  --data "methods[]=PUT"
```

#### Plugins
```bash
# List plugins
curl http://localhost:8001/plugins

# Create plugin
curl -X POST http://localhost:8001/plugins \
  --data "name=rate-limiting" \
  --data "service.name=product-service" \
  --data "config.minute=100"

# Update plugin
curl -X PATCH http://localhost:8001/plugins/{plugin_id} \
  --data "config.minute=200"

# Delete plugin
curl -X DELETE http://localhost:8001/plugins/{plugin_id}
```

## Monitoring and Observability

### Health Checks
```bash
# Kong health endpoint
curl http://localhost:8001/status
```

### Metrics with Prometheus
```bash
# Enable Prometheus plugin globally
curl -X POST http://localhost:8001/plugins \
  --data "name=prometheus" \
  --data "service.name=product-service"
```

### Logging
Kong supports various logging plugins:
- HTTP Log
- TCP Log
- UDP Log
- File Log
- Syslog
- StatsD
- Datadog

## Best Practices

### Security
1. **Use HTTPS**: Always configure SSL certificates
2. **Authentication**: Implement proper authentication plugins
3. **Rate Limiting**: Protect against abuse
4. **CORS**: Configure appropriately for web applications
5. **IP Restrictions**: Use whitelist/blacklist plugins

### Performance
1. **Load Balancing**: Use upstreams with multiple targets
2. **Caching**: Implement response caching where appropriate
3. **Connection Pooling**: Configure proper connection limits
4. **Monitoring**: Set up comprehensive monitoring

### Configuration Management
1. **Version Control**: Store Kong configuration in Git
2. **CI/CD**: Automate Kong configuration deployment
3. **Environment Separation**: Different configurations per environment
4. **Backup**: Regular backup of Kong database

## Troubleshooting

### Common Issues

#### Gateway Not Starting
```bash
# Check Kong logs
docker logs kong-gateway

# Check database connectivity
docker exec kong-gateway kong health
```

#### Routes Not Matching
```bash
# Check route configuration
curl http://localhost:8001/routes

# Test route matching
curl -H "Host: your-api.com" http://localhost:8000/api/test
```

#### Plugin Not Working
```bash
# Check plugin configuration
curl http://localhost:8001/plugins

# Check plugin logs
curl http://localhost:8001/logs
```

## Resources
- Kong Documentation: https://docs.konghq.com/
- Kong Hub (Plugins): https://docs.konghq.com/hub/
- Kong GitHub: https://github.com/Kong/kong
- Kong Community: https://discuss.konghq.com/