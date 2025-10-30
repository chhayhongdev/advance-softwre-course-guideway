# Kong API Gateway Integration Guide

## Overview
This guide demonstrates how to migrate from Spring Cloud Gateway to Kong API Gateway and integrate Kong with your existing Spring Boot microservices architecture. It covers configuration migration, service discovery integration, authentication, and deployment strategies.

## Migration Strategy

### Current Architecture vs Kong Architecture

**Current (Spring Cloud Gateway):**
- Embedded in Spring Boot application
- Java-based routing and filtering
- Eureka/Consul service discovery
- Spring Security integration
- Configuration via application.yml

**Kong Architecture:**
- Standalone API gateway (separate process)
- Lua-based plugins
- Service discovery via DNS or Kong's upstreams
- Plugin-based authentication and security
- Configuration via Admin API or declarative config

### Migration Steps
1. **Assessment**: Analyze current gateway configuration
2. **Planning**: Design Kong services, routes, and plugins
3. **Setup**: Deploy Kong infrastructure
4. **Configuration**: Migrate routes and policies
5. **Integration**: Connect with existing services
6. **Testing**: Validate functionality
7. **Deployment**: Roll out to production

## Kong Infrastructure Setup

### Docker Compose for Development
```yaml
version: '3.8'

services:
  # Kong Database
  kong-database:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: kong
      POSTGRES_USER: kong
      POSTGRES_PASSWORD: kongpass
    volumes:
      - kong_data:/var/lib/postgresql/data
    networks:
      - kong-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kong"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Kong Gateway
  kong-gateway:
    image: kong/kong-gateway:3.4
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: kong-database
      KONG_PG_PASSWORD: kongpass
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
      KONG_ADMIN_GUI_LISTEN: 0.0.0.0:8002
      KONG_PROXY_LISTEN: 0.0.0.0:8000, 0.0.0.0:8443 ssl
    depends_on:
      kong-database:
        condition: service_healthy
    ports:
      - "8000:8000"   # Proxy
      - "8443:8443"   # Proxy SSL
      - "8001:8001"   # Admin API
      - "8002:8002"   # Admin GUI
    networks:
      - kong-net
      - microservices-net
    healthcheck:
      test: ["CMD", "kong", "health"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Konga (Kong GUI Alternative)
  konga:
    image: pantsel/konga:latest
    environment:
      DB_ADAPTER: postgres
      DB_HOST: kong-database
      DB_USER: kong
      DB_PASSWORD: kongpass
      DB_DATABASE: kong
    depends_on:
      - kong-gateway
    ports:
      - "1337:1337"
    networks:
      - kong-net

volumes:
  kong_data:

networks:
  kong-net:
    driver: bridge
  microservices-net:
    external: true
```

### Kubernetes Deployment
```yaml
# Kong namespace
apiVersion: v1
kind: Namespace
metadata:
  name: kong
---
# Kong ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: kong-config
  namespace: kong
data:
  KONG_ADMIN_LISTEN: "0.0.0.0:8001"
  KONG_ADMIN_GUI_LISTEN: "0.0.0.0:8002"
  KONG_PROXY_LISTEN: "0.0.0.0:8000, 0.0.0.0:8443 ssl"
  KONG_DATABASE: "postgres"
  KONG_PG_HOST: "kong-postgres"
  KONG_PG_DATABASE: "kong"
  KONG_PG_USER: "kong"
---
# Kong Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kong-gateway
  namespace: kong
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kong-gateway
  template:
    metadata:
      labels:
        app: kong-gateway
    spec:
      containers:
      - name: kong
        image: kong/kong-gateway:3.4
        envFrom:
        - configMapRef:
            name: kong-config
        - secretRef:
            name: kong-secret
        ports:
        - containerPort: 8000
          name: proxy
        - containerPort: 8443
          name: proxy-ssl
        - containerPort: 8001
          name: admin
        - containerPort: 8002
          name: admin-gui
        livenessProbe:
          httpGet:
            path: /status
            port: 8001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /status
            port: 8001
          initialDelaySeconds: 5
          periodSeconds: 5
---
# Kong Service
apiVersion: v1
kind: Service
metadata:
  name: kong-gateway
  namespace: kong
spec:
  selector:
    app: kong-gateway
  ports:
  - name: proxy
    port: 80
    targetPort: 8000
  - name: proxy-ssl
    port: 443
    targetPort: 8443
  - name: admin
    port: 8001
    targetPort: 8001
  - name: admin-gui
    port: 8002
    targetPort: 8002
  type: LoadBalancer
```

## Service Migration

### Migrating from Spring Cloud Gateway Routes

**Current Spring Cloud Gateway Configuration:**
```yaml
spring:
  cloud:
    gateway:
      routes:
      - id: product-service
        uri: lb://product-service
        predicates:
        - Path=/api/products/**
        filters:
        - RewritePath=/api/products/(?<path>.*), /${path}
        - RateLimit=100,1m
      - id: order-service
        uri: lb://order-service
        predicates:
        - Path=/api/orders/**
        filters:
        - RewritePath=/api/orders/(?<path>.*), /${path}
        - AuthFilter
```

**Equivalent Kong Configuration:**
```bash
# Create Product Service
curl -X POST http://localhost:8001/services \
  --data "name=product-service" \
  --data "url=http://product-service.default.svc.cluster.local:8080"

# Create Product Route
curl -X POST http://localhost:8001/services/product-service/routes \
  --data "name=product-route" \
  --data "paths[]=/api/products" \
  --data "strip_path=false"

# Add Rate Limiting Plugin
curl -X POST http://localhost:8001/services/product-service/plugins \
  --data "name=rate-limiting" \
  --data "config.minute=100"

# Create Order Service
curl -X POST http://localhost:8001/services \
  --data "name=order-service" \
  --data "url=http://order-service.default.svc.cluster.local:8080"

# Create Order Route
curl -X POST http://localhost:8001/services/order-service/routes \
  --data "name=order-route" \
  --data "paths[]=/api/orders" \
  --data "strip_path=false"
```

### Declarative Configuration (kong.yml)
```yaml
_format_version: "3.0"

services:
- name: product-service
  url: http://product-service.default.svc.cluster.local:8080
  routes:
  - name: product-route
    paths:
    - /api/products
    strip_path: false
  plugins:
  - name: rate-limiting
    config:
      minute: 100
  - name: cors

- name: order-service
  url: http://order-service.default.svc.cluster.local:8080
  routes:
  - name: order-route
    paths:
    - /api/orders
    strip_path: false
  plugins:
  - name: rate-limiting
    config:
      minute: 50

- name: user-service
  url: http://user-service.default.svc.cluster.local:8080
  routes:
  - name: user-route
    paths:
    - /api/users
    strip_path: false
  plugins:
  - name: key-auth
  - name: rate-limiting
    config:
      minute: 200

consumers:
- username: ecommerce-app
  keyauth_credentials:
  - key: ecommerce-api-key-12345
```

## Authentication Integration

### JWT Authentication Migration

**Current Spring Security JWT:**
```java
@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(Customizer.withDefaults())
            )
            .build();
    }
}
```

**Kong JWT Plugin:**
```bash
# Enable JWT plugin globally or per service
curl -X POST http://localhost:8001/plugins \
  --data "name=jwt" \
  --data "service.name=user-service"

# Create consumer with JWT credentials
curl -X POST http://localhost:8001/consumers \
  --data "username=user-service-consumer"

# Add JWT credential
curl -X POST http://localhost:8001/consumers/user-service-consumer/jwt \
  --data "algorithm=HS256" \
  --data "key=your-jwt-secret-key" \
  --data "secret=your-jwt-secret"
```

### OAuth2 Integration
```bash
# OAuth2 Plugin Configuration
curl -X POST http://localhost:8001/plugins \
  --data "name=oauth2" \
  --data "service.name=api-gateway" \
  --data "config.provision_key=your-provision-key" \
  --data "config.token_expiration=7200" \
  --data "config.enable_authorization_code=true"
```

## Load Balancing and Service Discovery

### Kong Upstream Configuration
```bash
# Create upstream for product service
curl -X POST http://localhost:8001/upstreams \
  --data "name=product-service-upstream" \
  --data "algorithm=round_robin"

# Add targets (service instances)
curl -X POST http://localhost:8001/upstreams/product-service-upstream/targets \
  --data "target=product-service-1:8080" \
  --data "weight=100"

curl -X POST http://localhost:8001/upstreams/product-service-upstream/targets \
  --data "target=product-service-2:8080" \
  --data "weight=100"

# Create service using upstream
curl -X POST http://localhost:8001/services \
  --data "name=product-service" \
  --data "host=product-service-upstream"
```

### Kubernetes Service Discovery
```yaml
# Kubernetes Service for Product Service
apiVersion: v1
kind: Service
metadata:
  name: product-service
  namespace: ecommerce
spec:
  selector:
    app: product-service
  ports:
  - port: 8080
    targetPort: 8080
  clusterIP: None  # Headless service for individual pod access
---
# Kong Service Configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: kong-services-config
  namespace: kong
data:
  services.yml: |
    services:
    - name: product-service
      host: product-service.ecommerce.svc.cluster.local
      port: 8080
      routes:
      - paths:
        - /api/products
```

## Circuit Breaker and Resilience

### Kong Circuit Breaker Plugin
```bash
# Add circuit breaker plugin
curl -X POST http://localhost:8001/plugins \
  --data "name=circuit-breaker" \
  --data "service.name=product-service" \
  --data "config.failure_threshold=0.5" \
  --data "config.interval=30" \
  --data "config.timeout=10"
```

### Retry Plugin
```bash
# Add retry plugin
curl -X POST http://localhost:8001/plugins \
  --data "name=retry" \
  --data "service.name=product-service" \
  --data "config.retries=3" \
  --data "config.upstream_connect_timeout=5000" \
  --data "config.upstream_send_timeout=10000" \
  --data "config.upstream_read_timeout=30000"
```

## Monitoring and Observability

### Prometheus Integration
```bash
# Enable Prometheus plugin globally
curl -X POST http://localhost:8001/plugins \
  --data "name=prometheus"

# Configure Prometheus scrape target
scrape_configs:
  - job_name: 'kong'
    static_configs:
      - targets: ['kong-gateway:8001']
```

### Centralized Logging
```bash
# HTTP Log plugin for centralized logging
curl -X POST http://localhost:8001/plugins \
  --data "name=http-log" \
  --data "service.name=product-service" \
  --data "config.http_endpoint=http://log-aggregator:8080/logs" \
  --data "config.method=POST" \
  --data "config.content_type=application/json"
```

### Distributed Tracing
```bash
# Zipkin plugin for distributed tracing
curl -X POST http://localhost:8001/plugins \
  --data "name=zipkin" \
  --data "config.http_endpoint=http://zipkin:9411/api/v2/spans" \
  --data "config.sample_ratio=0.1"
```

## SSL/TLS Configuration

### Certificate Management
```bash
# Add SSL certificate
curl -X POST http://localhost:8001/certificates \
  --data "cert=$(cat server.crt)" \
  --data "key=$(cat server.key)" \
  --data "snis[]=api.example.com"
```

### HTTPS Redirection
```bash
# HTTPS redirect plugin
curl -X POST http://localhost:8001/plugins \
  --data "name=https-redirect" \
  --data "config.status_code=301"
```

## API Versioning and Transformation

### API Versioning
```bash
# Header-based versioning
curl -X POST http://localhost:8001/services/product-service/routes \
  --data "name=product-v1" \
  --data "paths[]=/api/v1/products" \
  --data "headers.Version=v1"

curl -X POST http://localhost:8001/services/product-service/routes \
  --data "name=product-v2" \
  --data "paths[]=/api/v2/products" \
  --data "headers.Version=v2"
```

### Request/Response Transformation
```bash
# Request transformer
curl -X POST http://localhost:8001/plugins \
  --data "name=request-transformer" \
  --data "service.name=product-service" \
  --data "config.add.headers=X-API-Version:1.0" \
  --data "config.add.headers=X-Request-ID:$(uuid)"

# Response transformer
curl -X POST http://localhost:8001/plugins \
  --data "name=response-transformer" \
  --data "service.name=product-service" \
  --data "config.add.headers=X-Response-Time:$(msec)"
```

## Migration Testing Strategy

### Test Cases
1. **Route Migration Testing**
2. **Authentication Testing**
3. **Rate Limiting Testing**
4. **Load Balancing Testing**
5. **SSL/TLS Testing**
6. **Monitoring Integration Testing**

### Automated Testing
```bash
# Kong configuration validation
curl http://localhost:8001/config

# Test route functionality
curl -H "Authorization: Bearer <token>" \
     http://localhost:8000/api/products

# Test rate limiting
for i in {1..110}; do
  curl http://localhost:8000/api/products
done
```

## CI/CD Integration

### Kong Configuration in Git
```yaml
# .github/workflows/deploy-kong.yml
name: Deploy Kong Configuration

on:
  push:
    branches: [main]
    paths:
      - 'kong/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Kong CLI
      run: |
        curl -Lo kong.deb https://github.com/Kong/deck/releases/latest/download/kong.deb
        sudo dpkg -i kong.deb
        
    - name: Deploy Kong Configuration
      run: |
        deck sync --config kong/kong.yml \
                  --kong-addr http://kong-admin:8001
```

### Blue-Green Deployment
```bash
# Create blue environment
curl -X POST http://localhost:8001/services \
  --data "name=product-service-blue" \
  --data "url=http://product-service-blue:8080"

# Create green environment
curl -X POST http://localhost:8001/services \
  --data "name=product-service-green" \
  --data "url=http://product-service-green:8080"

# Switch traffic (update route)
curl -X PATCH http://localhost:8001/routes/product-route \
  --data "service.name=product-service-green"
```

## Performance Optimization

### Kong Tuning
```bash
# Kong environment variables for performance
KONG_NGINX_WORKER_PROCESSES=auto
KONG_NGINX_WORKER_CONNECTIONS=1024
KONG_UPSTREAM_KEEPALIVE=60
KONG_CLIENT_MAX_BODY_SIZE=50m
KONG_CLIENT_BODY_BUFFER_SIZE=10m
```

### Caching Strategies
```bash
# Response caching
curl -X POST http://localhost:8001/plugins \
  --data "name=proxy-cache" \
  --data "service.name=product-service" \
  --data "config.request_method=GET" \
  --data "config.response_code=200" \
  --data "config.cache_ttl=300"
```

## Troubleshooting Migration Issues

### Common Migration Problems

#### Service Discovery Issues
```bash
# Check service registration
curl http://localhost:8001/services

# Test service connectivity
curl http://localhost:8001/upstreams/{upstream_name}/health
```

#### Authentication Failures
```bash
# Check plugin configuration
curl http://localhost:8001/plugins

# Validate consumer credentials
curl http://localhost:8001/consumers/{consumer_name}/key-auth
```

#### Performance Degradation
```bash
# Check Kong metrics
curl http://localhost:8001/metrics

# Monitor upstream health
curl http://localhost:8001/upstreams/{upstream_name}/targets
```

## Rollback Strategy

### Configuration Backup
```bash
# Export current configuration
curl http://localhost:8001/config > kong-backup-$(date +%Y%m%d-%H%M%S).yml
```

### Gradual Rollback
```bash
# Reduce Kong traffic gradually
curl -X PATCH http://localhost:8001/routes/{route_id} \
  --data "weight=50"  # Reduce to 50% traffic

# Complete rollback
curl -X PATCH http://localhost:8001/routes/{route_id} \
  --data "weight=0"   # Stop sending traffic to Kong
```

## Resources
- Kong Migration Guide: https://docs.konghq.com/gateway/latest/migrate/
- Kong Configuration Reference: https://docs.konghq.com/gateway/latest/admin-api/
- Spring Cloud Gateway to Kong: https://docs.konghq.com/gateway/latest/migrate/spring-cloud-gateway/
- Kong Best Practices: https://docs.konghq.com/gateway/latest/production/operating/