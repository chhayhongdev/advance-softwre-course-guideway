# Module 3: Spring Cloud for Distributed Systems

## Overview
This module explores Spring Cloud components that enable building robust distributed systems. Students will learn to implement service discovery, centralized configuration management, and API gateway patterns using Spring Cloud Netflix and Spring Cloud ecosystem.

## Topics

### Service Discovery
- **Understanding service discovery in distributed systems:**
  - Problem: How do services find and communicate with each other dynamically?
  - Solution: Service registry where services register themselves and discover others
  - Benefits: Dynamic scaling, load balancing, fault tolerance
  - Patterns: Client-side vs server-side discovery

- **Implementing service registration and discovery with Spring Cloud Eureka:**
  - Eureka Server: Registry for service instances
  - Eureka Client: Registers with server and discovers other services
  - Service registration on startup
  - Heartbeat mechanism for health monitoring

- **Eureka server setup and configuration:**
  - Standalone Eureka server application
  - Self-preservation mode
  - Peer-to-peer replication for high availability
  - Configuration properties

- **Client-side service discovery and load balancing:**
  - Ribbon load balancer integration
  - Multiple service instances behind single logical name
  - Load balancing algorithms (Round Robin, Random, etc.)
  - Zone-aware load balancing

- **Handling service failures and health checks:**
  - Eureka health checks
  - Service instance lifecycle (UP, DOWN, OUT_OF_SERVICE)
  - Circuit breaker integration
  - Graceful shutdown handling

  ```java
  // Eureka Server Configuration
  @SpringBootApplication
  @EnableEurekaServer
  public class EurekaServerApplication {
      public static void main(String[] args) {
          SpringApplication.run(EurekaServerApplication.class, args);
      }
  }

  // application.yml for Eureka Server
  server:
    port: 8761

  eureka:
    instance:
      hostname: localhost
    client:
      registerWithEureka: false
      fetchRegistry: false
      serviceUrl:
        defaultZone: http://${eureka.instance.hostname}:${server.port}/eureka/
    server:
      enableSelfPreservation: false  # For development

  // Eureka Client Configuration
  @SpringBootApplication
  @EnableEurekaClient
  public class ProductServiceApplication {
      public static void main(String[] args) {
          SpringApplication.run(ProductServiceApplication.class, args);
      }
  }

  // application.yml for Eureka Client
  spring:
    application:
      name: product-service

  server:
    port: 8081

  eureka:
    instance:
      preferIpAddress: true
      leaseRenewalIntervalInSeconds: 30
      leaseExpirationDurationInSeconds: 90
    client:
      serviceUrl:
        defaultZone: http://localhost:8761/eureka/
      registerWithEureka: true
      fetchRegistry: true

  // Service using Eureka Client
  @Service
  public class OrderService {
      
      @Autowired
      private RestTemplate restTemplate;
      
      public ProductDTO getProduct(Long productId) {
          // Using logical service name instead of hardcoded URL
          String url = "http://product-service/api/products/" + productId;
          return restTemplate.getForObject(url, ProductDTO.class);
      }
      
      @Bean
      @LoadBalanced  // Enables client-side load balancing
      public RestTemplate restTemplate() {
          return new RestTemplate();
      }
  }
  ```

### Centralized Configuration
- **Externalized configuration management:**
  - Configuration scattered across multiple services
  - Environment-specific settings (dev, test, prod)
  - Dynamic configuration changes without redeployment
  - Centralized configuration repository

- **Setting up Spring Cloud Config server:**
  - Dedicated configuration server
  - Backend repositories (Git, file system, database)
  - Encryption/decryption of sensitive data
  - Version control integration

- **Configuration repositories (Git, file system):**
  - Git repository for version-controlled configurations
  - Branch/tag support for different environments
  - File system for simple setups
  - Database backend for dynamic configurations

- **Client-side configuration retrieval:**
  - Config client auto-configuration
  - Bootstrap context loading
  - Profile-specific configurations
  - Configuration precedence rules

- **Refreshing configurations without restarting services:**
  - @RefreshScope annotation
  - Actuator refresh endpoint
  - Spring Cloud Bus for broadcasting changes
  - Manual vs automatic refresh strategies

  ```java
  // Config Server Application
  @SpringBootApplication
  @EnableConfigServer
  public class ConfigServerApplication {
      public static void main(String[] args) {
          SpringApplication.run(ConfigServerApplication.class, args);
      }
  }

  // application.yml for Config Server
  server:
    port: 8888

  spring:
    cloud:
      config:
        server:
          git:
            uri: https://github.com/your-org/config-repo
            search-paths: '{application}'
            default-label: main
          encrypt:
            enabled: true

  // Config Client Application
  @SpringBootApplication
  @EnableEurekaClient
  public class ProductServiceApplication {
      public static void main(String[] args) {
          SpringApplication.run(ProductServiceApplication.class, args);
      }
  }

  // bootstrap.yml for Config Client
  spring:
    application:
      name: product-service
    profiles:
      active: development
    cloud:
      config:
        uri: http://localhost:8888
        fail-fast: true

  // Configuration files in Git repository
  // product-service-development.yml
  server:
    port: 8081

  spring:
    datasource:
      url: jdbc:h2:mem:testdb
      username: sa
      password:

  app:
    features:
      inventory-check: true
    limits:
      max-products-per-page: 50

  // product-service-production.yml
  server:
    port: 8081

  spring:
    datasource:
      url: jdbc:postgresql://prod-db:5432/products
      username: ${DB_USER}
      password: ${DB_PASSWORD}

  app:
    features:
      inventory-check: true
    limits:
      max-products-per-page: 100

  // Service using @RefreshScope
  @Service
  @RefreshScope
  public class ProductService {
      
      @Value("${app.limits.max-products-per-page}")
      private int maxProductsPerPage;
      
      @Value("${app.features.inventory-check}")
      private boolean inventoryCheckEnabled;
      
      public Page<Product> getProducts(Pageable pageable) {
          if (pageable.getPageSize() > maxProductsPerPage) {
              throw new IllegalArgumentException("Page size exceeds maximum allowed: " + maxProductsPerPage);
          }
          
          Page<Product> products = productRepository.findAll(pageable);
          
          if (inventoryCheckEnabled) {
              // Perform inventory checks
              products.forEach(this::checkInventory);
          }
          
          return products;
      }
      
      // Refresh endpoint: POST /actuator/refresh
      // Bus refresh endpoint: POST /actuator/busrefresh
  }
  ```

### API Gateway
- **Role of API Gateway in microservices architecture:**
  - Single entry point for all client requests
  - Request routing to appropriate services
  - Cross-cutting concerns (authentication, logging, rate limiting)
  - Protocol translation (HTTP to other protocols)
  - Response aggregation from multiple services

- **Routing requests to multiple microservices using Spring Cloud Gateway:**
  - Route definitions with predicates and filters
  - Path-based routing
  - Load balancing integration
  - Circuit breaker integration

- **Implementing filters for cross-cutting concerns:**
  - Pre-filters: Authentication, rate limiting, request transformation
  - Post-filters: Response transformation, logging, error handling
  - Global filters vs route-specific filters
  - Custom filter implementation

- **Security, rate limiting, and request transformation:**
  - JWT token validation
  - OAuth2 integration
  - Rate limiting algorithms (Token Bucket, Leaky Bucket)
  - Request/response transformation
  - CORS handling

- **Load balancing and circuit breaker integration:**
  - Integration with Eureka for service discovery
  - Load balancing strategies
  - Resilience4j circuit breaker integration
  - Fallback responses

  ```java
  // API Gateway Application
  @SpringBootApplication
  @EnableEurekaClient
  public class ApiGatewayApplication {
      public static void main(String[] args) {
          SpringApplication.run(ApiGatewayApplication.class, args);
      }
  }

  // application.yml for API Gateway
  spring:
    application:
      name: api-gateway
    cloud:
      gateway:
        routes:
          - id: product-service
            uri: lb://product-service
            predicates:
              - Path=/api/products/**
            filters:
              - RewritePath=/api/products/(?<path>.*), /${path}
              - RateLimit=10,1m  # 10 requests per minute
              - CircuitBreaker=customCircuitBreaker
              
          - id: order-service
            uri: lb://order-service
            predicates:
              - Path=/api/orders/**
            filters:
              - RewritePath=/api/orders/(?<path>.*), /${path}
              - AuthFilter
              
          - id: user-service
            uri: lb://user-service
            predicates:
              - Path=/api/users/**
            filters:
              - RewritePath=/api/users/(?<path>.*), /${path}
              - RequestSize=5MB

  # Circuit Breaker Configuration
  resilience4j:
    circuitbreaker:
      configs:
        default:
          slidingWindowSize: 10
          permittedNumberOfCallsInHalfOpenState: 3
          slidingWindowType: COUNT_BASED
          minimumNumberOfCalls: 5
          waitDurationInOpenState: 10000
          failureRateThreshold: 50
      instances:
        customCircuitBreaker:
          baseConfig: default

  # Rate Limiting Configuration
  redis:
    host: localhost
    port: 6379

  // Custom Authentication Filter
  @Component
  public class AuthFilter implements GlobalFilter, Ordered {
      
      @Autowired
      private JwtUtil jwtUtil;
      
      @Override
      public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
          ServerHttpRequest request = exchange.getRequest();
          
          if (isSecured(request)) {
              if (authMissing(request)) {
                  return onError(exchange, "Authorization header is missing", HttpStatus.UNAUTHORIZED);
              }
              
              final String token = getAuthHeader(request);
              
              if (jwtUtil.isInvalid(token)) {
                  return onError(exchange, "Authorization header is invalid", HttpStatus.UNAUTHORIZED);
              }
              
              populateRequestWithHeaders(exchange, token);
          }
          
          return chain.filter(exchange);
      }
      
      private boolean isSecured(ServerHttpRequest request) {
          return request.getURI().getPath().startsWith("/api/");
      }
      
      private boolean authMissing(ServerHttpRequest request) {
          return !request.getHeaders().containsKey("Authorization");
      }
      
      private String getAuthHeader(ServerHttpRequest request) {
          return request.getHeaders().getOrEmpty("Authorization").get(0);
      }
      
      private void populateRequestWithHeaders(ServerWebExchange exchange, String token) {
          Claims claims = jwtUtil.getAllClaimsFromToken(token);
          exchange.getRequest().mutate()
              .header("user-id", claims.getSubject())
              .header("user-role", claims.get("role").toString())
              .build();
      }
      
      private Mono<Void> onError(ServerWebExchange exchange, String err, HttpStatus httpStatus) {
          ServerHttpResponse response = exchange.getResponse();
          response.setStatusCode(httpStatus);
          return response.setComplete();
      }
      
      @Override
      public int getOrder() {
          return -1;
      }
  }

  // Custom Rate Limiting Filter
  @Component
  public class RateLimitFilter implements GlobalFilter, Ordered {
      
      @Autowired
      private RedisTemplate<String, String> redisTemplate;
      
      @Override
      public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
          String clientId = getClientId(exchange.getRequest());
          String key = "rate_limit:" + clientId;
          
          Long currentRequests = redisTemplate.opsForValue().increment(key);
          
          if (currentRequests == 1) {
              redisTemplate.expire(key, 1, TimeUnit.MINUTES);
          }
          
          if (currentRequests > 10) {  // 10 requests per minute
              exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
              return exchange.getResponse().setComplete();
          }
          
          return chain.filter(exchange);
      }
      
      private String getClientId(ServerHttpRequest request) {
          // Extract client identifier (IP, API key, etc.)
          return request.getRemoteAddress().getAddress().getHostAddress();
      }
      
      @Override
      public int getOrder() {
          return -2;
      }
  }
  ```

## Project: Enhanced E-commerce with Spring Cloud
**Objective:** Enhance the existing e-commerce microservices with Spring Cloud components for production-ready distributed system capabilities.

**Requirements:**
1. Set up Eureka service discovery
2. Implement centralized configuration with Spring Cloud Config
3. Create API Gateway with routing, authentication, and rate limiting
4. Add circuit breaker patterns
5. Implement distributed configuration management
6. Enable dynamic service scaling and discovery

**Implementation Steps:**

**1. Eureka Server Setup:**
```yaml
# docker-compose.yml for Eureka and Config Server
version: '3.8'
services:
  eureka-server:
    image: your-registry/eureka-server:latest
    ports:
      - "8761:8761"
    environment:
      - EUREKA_INSTANCE_HOSTNAME=eureka-server
      
  config-server:
    image: your-registry/config-server:latest
    ports:
      - "8888:8888"
    environment:
      - SPRING_PROFILES_ACTIVE=native
      - SPRING_CLOUD_CONFIG_SERVER_NATIVE_SEARCH_LOCATIONS=file:///config-repo
    volumes:
      - ./config-repo:/config-repo
```

**2. Service Registration:**
```java
// All services register with Eureka
@SpringBootApplication
@EnableEurekaClient
public class ProductServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ProductServiceApplication.class, args);
    }
}

// application.yml
spring:
  application:
    name: product-service
  profiles:
    active: development
  cloud:
    config:
      uri: http://config-server:8888

eureka:
  instance:
    preferIpAddress: true
    instance-id: ${spring.application.name}:${random.value}
  client:
    serviceUrl:
      defaultZone: http://eureka-server:8761/eureka/
```

**3. API Gateway Configuration:**
```yaml
# gateway application.yml
spring:
  application:
    name: api-gateway
  cloud:
    gateway:
      routes:
        - id: product-route
          uri: lb://product-service
          predicates:
            - Path=/api/v1/products/**
          filters:
            - RewritePath=/api/v1/products/(?<path>.*), /api/products/${path}
            - AuthFilter
            - RateLimitFilter
            
        - id: order-route
          uri: lb://order-service
          predicates:
            - Path=/api/v1/orders/**
          filters:
            - RewritePath=/api/v1/orders/(?<path>.*), /api/orders/${path}
            - AuthFilter
            
        - id: user-route
          uri: lb://user-service
          predicates:
            - Path=/api/v1/users/**
          filters:
            - RewritePath=/api/v1/users/(?<path>.*), /api/users/${path}

management:
  endpoints:
    web:
      exposure:
        include: health,info,gateway
  endpoint:
    gateway:
      enabled: true
```

**4. Centralized Configuration:**
```
# Config repository structure
config-repo/
├── product-service.yml
├── product-service-development.yml
├── product-service-production.yml
├── order-service.yml
├── order-service-development.yml
├── order-service-production.yml
├── user-service.yml
├── user-service-development.yml
├── user-service-production.yml
└── api-gateway.yml
```

**5. Circuit Breaker Implementation:**
```java
@Service
public class OrderService {
    
    @Autowired
    private ProductServiceClient productClient;
    
    @CircuitBreaker(name = "productService", fallbackMethod = "getProductFallback")
    public ProductDTO getProduct(Long productId) {
        return productClient.getProduct(productId);
    }
    
    public ProductDTO getProductFallback(Long productId, Throwable throwable) {
        // Return cached or default product data
        return new ProductDTO(productId, "Product temporarily unavailable", BigDecimal.ZERO);
    }
    
    @Retry(name = "productService")
    public List<ProductDTO> getProducts() {
        return productClient.getAllProducts();
    }
}
```

**Deliverables:**
- Eureka server and client configurations
- Spring Cloud Config server with Git backend
- API Gateway with custom filters and routing rules
- Circuit breaker implementations
- Docker Compose setup for local development
- Configuration files for multiple environments
- Documentation for service discovery and configuration management

## Learning Outcomes
By the end of this module, students will be able to:
- Set up and configure Eureka service discovery
- Implement centralized configuration management with Spring Cloud Config
- Create API Gateway with routing, filtering, and security
- Implement circuit breaker and retry patterns
- Manage distributed configurations across environments
- Deploy and scale microservices with service discovery
- Monitor and troubleshoot distributed systems

## Resources
- "Spring Microservices in Action" by John Carnell
- Spring Cloud Documentation: https://spring.io/projects/spring-cloud
- Netflix Eureka Documentation
- Spring Cloud Gateway Reference
- "Microservices Patterns" by Chris Richardson
- Docker Compose Documentation