# Module 4: Resiliency, Security, and Observability

## Overview
This module focuses on production-ready microservices by implementing resiliency patterns, comprehensive security, distributed tracing, and monitoring capabilities. Students will learn to build robust, secure, and observable distributed systems using industry-standard tools and practices.

## Topics

### Resiliency and Fault Tolerance
- **Understanding resiliency in distributed systems:**
  - Network failures, service unavailability, cascading failures
  - Importance of graceful degradation and fault isolation
  - Recovery patterns and self-healing systems
  - Chaos engineering principles

- **Implementing Circuit Breaker pattern with Resilience4j:**
  - Circuit states: CLOSED, OPEN, HALF_OPEN
  - Failure threshold and recovery timeout
  - Automatic failure detection and recovery
  - Integration with Spring Boot

- **Retry mechanisms and fallback strategies:**
  - Exponential backoff and jitter
  - Configurable retry policies
  - Fallback methods for graceful degradation
  - Cache-as-fallback patterns

- **Bulkhead pattern for resource isolation:**
  - Thread pool isolation
  - Semaphore-based isolation
  - Preventing resource exhaustion
  - Service-level isolation

- **Handling timeouts and rate limiting:**
  - Request timeouts and connection timeouts
  - Rate limiting algorithms (Token Bucket, Leaky Bucket)
  - Queue management and backpressure
  - Client-side throttling

  ```java
  // Resilience4j Configuration
  @Configuration
  public class ResilienceConfig {
      
      @Bean
      public CircuitBreakerRegistry circuitBreakerRegistry() {
          CircuitBreakerConfig config = CircuitBreakerConfig.custom()
              .failureRateThreshold(50)  // Open circuit if 50% failures
              .waitDurationInOpenState(Duration.ofMillis(10000))  // Wait 10s before half-open
              .slidingWindowSize(10)  // Consider last 10 calls
              .permittedNumberOfCallsInHalfOpenState(3)  // Allow 3 test calls
              .build();
          
          return CircuitBreakerRegistry.of(config);
      }
      
      @Bean
      public RetryRegistry retryRegistry() {
          RetryConfig config = RetryConfig.custom()
              .maxAttempts(3)
              .waitDuration(Duration.ofMillis(100))
              .retryExceptions(IOException.class, TimeoutException.class)
              .build();
          
          return RetryRegistry.of(config);
      }
      
      @Bean
      public BulkheadRegistry bulkheadRegistry() {
          BulkheadConfig config = BulkheadConfig.custom()
              .maxConcurrentCalls(10)  // Max 10 concurrent calls
              .maxWaitDuration(Duration.ofMillis(500))  // Wait up to 500ms
              .build();
          
          return BulkheadRegistry.of(config);
      }
  }

  // Service with Resilience Patterns
  @Service
  public class OrderService {
      
      @Autowired
      private CircuitBreakerRegistry circuitBreakerRegistry;
      
      @Autowired
      private RetryRegistry retryRegistry;
      
      @Autowired
      private BulkheadRegistry bulkheadRegistry;
      
      @Autowired
      private ProductServiceClient productClient;
      
      @Autowired
      private PaymentServiceClient paymentClient;
      
      public OrderDTO createOrder(CreateOrderRequest request) {
          // Circuit Breaker for product service
          CircuitBreaker circuitBreaker = circuitBreakerRegistry.circuitBreaker("productService");
          
          // Bulkhead for resource isolation
          Bulkhead bulkhead = bulkheadRegistry.bulkhead("productService");
          
          // Retry with exponential backoff
          Retry retry = retryRegistry.retry("productService");
          
          Supplier<ProductDTO> productSupplier = () -> productClient.getProduct(request.getProductId());
          
          // Apply all resilience patterns
          Supplier<ProductDTO> decoratedSupplier = Decorators.ofSupplier(productSupplier)
              .withCircuitBreaker(circuitBreaker)
              .withBulkhead(bulkhead)
              .withRetry(retry)
              .withFallback(this::getProductFallback)
              .decorate();
          
          try {
              ProductDTO product = decoratedSupplier.get();
              
              // Process payment with timeout
              PaymentResponse payment = processPaymentWithTimeout(request.getPaymentInfo());
              
              if (payment.isSuccessful()) {
                  return createOrderEntity(request, product);
              } else {
                  throw new PaymentFailedException("Payment processing failed");
              }
              
          } catch (Exception e) {
              throw new OrderCreationException("Failed to create order: " + e.getMessage(), e);
          }
      }
      
      private ProductDTO getProductFallback(Throwable throwable) {
          // Return cached or default product data
          return ProductDTO.builder()
              .id(-1L)
              .name("Product temporarily unavailable")
              .price(BigDecimal.ZERO)
              .build();
      }
      
      @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
      @TimeLimiter(name = "paymentService")
      @Bulkhead(name = "paymentService")
      public PaymentResponse processPaymentWithTimeout(PaymentInfo paymentInfo) {
          // Simulate payment processing with potential delay
          if (Math.random() > 0.8) {
              throw new RuntimeException("Payment service unavailable");
          }
          
          return paymentClient.processPayment(paymentInfo);
      }
      
      public PaymentResponse paymentFallback(PaymentInfo paymentInfo, Throwable throwable) {
          return PaymentResponse.builder()
              .successful(false)
              .message("Payment service temporarily unavailable")
              .build();
      }
  }

  // Rate Limiting Configuration
  @Configuration
  public class RateLimitConfig {
      
      @Bean
      public RateLimiterRegistry rateLimiterRegistry() {
          RateLimiterConfig config = RateLimiterConfig.custom()
              .limitForPeriod(10)  // 10 requests
              .limitRefreshPeriod(Duration.ofMinutes(1))  // per minute
              .timeoutDuration(Duration.ofMillis(100))  // wait up to 100ms
              .build();
          
          return RateLimiterRegistry.of(config);
      }
  }

  // Controller with Rate Limiting
  @RestController
  @RequestMapping("/api/orders")
  public class OrderController {
      
      @Autowired
      private OrderService orderService;
      
      @Autowired
      private RateLimiterRegistry rateLimiterRegistry;
      
      @PostMapping
      public ResponseEntity<OrderDTO> createOrder(@Valid @RequestBody CreateOrderRequest request) {
          RateLimiter rateLimiter = rateLimiterRegistry.rateLimiter("orderCreation");
          
          return RateLimiter.decorateSupplier(rateLimiter, () -> {
              OrderDTO order = orderService.createOrder(request);
              return ResponseEntity.status(HttpStatus.CREATED).body(order);
          }).get();
      }
  }
  ```

### Securing Microservices
- **Security challenges in microservices architecture:**
  - Distributed authentication and authorization
  - Inter-service security without user context
  - API gateway security
  - Service-to-service communication security
  - Managing secrets and certificates

- **Authentication and authorization strategies:**
  - Session-based vs token-based authentication
  - Role-based access control (RBAC)
  - Claims-based authorization
  - Service accounts for inter-service calls

- **JWT (JSON Web Tokens) for stateless authentication:**
  - JWT structure: Header, Payload, Signature
  - Token generation and validation
  - Refresh tokens and token expiration
  - Security best practices

- **OAuth2 for delegated authorization:**
  - OAuth2 flow types: Authorization Code, Implicit, Client Credentials
  - Resource Owner, Client, Authorization Server, Resource Server roles
  - Access tokens and refresh tokens
  - Scope-based permissions

- **Integrating Keycloak for identity and access management:**
  - Keycloak as identity provider
  - Realm and client configuration
  - User management and roles
  - Social login integration

  ```java
  // JWT Configuration
  @Configuration
  @EnableWebSecurity
  public class SecurityConfig extends WebSecurityConfigurerAdapter {
      
      @Autowired
      private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
      
      @Autowired
      private JwtRequestFilter jwtRequestFilter;
      
      @Autowired
      public void configureGlobal(AuthenticationManagerBuilder auth) throws Exception {
          auth.userDetailsService(userDetailsService()).passwordEncoder(passwordEncoder());
      }
      
      @Bean
      public PasswordEncoder passwordEncoder() {
          return new BCryptPasswordEncoder();
      }
      
      @Bean
      @Override
      public AuthenticationManager authenticationManagerBean() throws Exception {
          return super.authenticationManagerBean();
      }
      
      @Override
      protected void configure(HttpSecurity http) throws Exception {
          http.csrf().disable()
              .authorizeRequests()
              .antMatchers("/api/authenticate").permitAll()
              .antMatchers("/api/products/**").hasRole("USER")
              .antMatchers("/api/admin/**").hasRole("ADMIN")
              .anyRequest().authenticated()
              .and()
              .exceptionHandling().authenticationEntryPoint(jwtAuthenticationEntryPoint)
              .and()
              .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS);
          
          http.addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);
      }
  }

  // JWT Utility Class
  @Component
  public class JwtUtil {
      
      @Value("${jwt.secret}")
      private String secret;
      
      @Value("${jwt.expiration}")
      private int jwtExpirationInMs;
      
      public String generateToken(UserDetails userDetails) {
          Map<String, Object> claims = new HashMap<>();
          claims.put("roles", userDetails.getAuthorities().stream()
              .map(GrantedAuthority::getAuthority)
              .collect(Collectors.toList()));
          
          return Jwts.builder()
              .setClaims(claims)
              .setSubject(userDetails.getUsername())
              .setIssuedAt(new Date())
              .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationInMs))
              .signWith(SignatureAlgorithm.HS512, secret)
              .compact();
      }
      
      public String getUsernameFromToken(String token) {
          return getClaimsFromToken(token).getSubject();
      }
      
      public List<String> getRolesFromToken(String token) {
          Claims claims = getClaimsFromToken(token);
          return claims.get("roles", List.class);
      }
      
      public boolean validateToken(String token, UserDetails userDetails) {
          final String username = getUsernameFromToken(token);
          return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
      }
      
      private Claims getClaimsFromToken(String token) {
          return Jwts.parser().setSigningKey(secret).parseClaimsJws(token).getBody();
      }
      
      private boolean isTokenExpired(String token) {
          final Date expiration = getClaimsFromToken(token).getExpiration();
          return expiration.before(new Date());
      }
  }

  // JWT Request Filter
  @Component
  public class JwtRequestFilter extends OncePerRequestFilter {
      
      @Autowired
      private JwtUtil jwtUtil;
      
      @Autowired
      private UserDetailsService userDetailsService;
      
      @Override
      protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
              throws ServletException, IOException {
          
          final String requestTokenHeader = request.getHeader("Authorization");
          
          String username = null;
          String jwtToken = null;
          
          if (requestTokenHeader != null && requestTokenHeader.startsWith("Bearer ")) {
              jwtToken = requestTokenHeader.substring(7);
              try {
                  username = jwtUtil.getUsernameFromToken(jwtToken);
              } catch (IllegalArgumentException e) {
                  logger.error("Unable to get JWT Token");
              } catch (ExpiredJwtException e) {
                  logger.error("JWT Token has expired");
              }
          }
          
          if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
              UserDetails userDetails = userDetailsService.loadUserByUsername(username);
              
              if (jwtUtil.validateToken(jwtToken, userDetails)) {
                  UsernamePasswordAuthenticationToken authenticationToken =
                      new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                  
                  authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                  SecurityContextHolder.getContext().setAuthentication(authenticationToken);
              }
          }
          
          chain.doFilter(request, response);
      }
  }

  // Authentication Controller
  @RestController
  @RequestMapping("/api")
  public class AuthenticationController {
      
      @Autowired
      private AuthenticationManager authenticationManager;
      
      @Autowired
      private JwtUtil jwtUtil;
      
      @Autowired
      private UserDetailsService userDetailsService;
      
      @PostMapping("/authenticate")
      public ResponseEntity<?> createAuthenticationToken(@RequestBody AuthenticationRequest authRequest) throws Exception {
          
          try {
              authenticationManager.authenticate(
                  new UsernamePasswordAuthenticationToken(authRequest.getUsername(), authRequest.getPassword())
              );
          } catch (BadCredentialsException e) {
              throw new Exception("Incorrect username or password", e);
          }
          
          final UserDetails userDetails = userDetailsService.loadUserByUsername(authRequest.getUsername());
          final String jwt = jwtUtil.generateToken(userDetails);
          
          return ResponseEntity.ok(new AuthenticationResponse(jwt));
      }
  }

  // OAuth2 Configuration (for Keycloak integration)
  @Configuration
  @EnableOAuth2Sso
  public class OAuth2Config extends WebSecurityConfigurerAdapter {
      
      @Override
      protected void configure(HttpSecurity http) throws Exception {
          http.csrf().disable()
              .authorizeRequests()
              .antMatchers("/login", "/oauth2/**").permitAll()
              .anyRequest().authenticated()
              .and()
              .oauth2Login()
              .and()
              .logout()
              .logoutSuccessUrl("/");
      }
  }

  // Service-to-Service Authentication
  @Service
  public class ServiceAuthenticationService {
      
      @Autowired
      private RestTemplate restTemplate;
      
      public String getServiceToken() {
          // Get client credentials token for service-to-service calls
          // Implementation would call OAuth2 token endpoint
          return "service-token";
      }
      
      public <T> ResponseEntity<T> callService(String url, HttpMethod method, Object request, Class<T> responseType) {
          HttpHeaders headers = new HttpHeaders();
          headers.setBearerAuth(getServiceToken());
          
          HttpEntity<Object> entity = new HttpEntity<>(request, headers);
          
          return restTemplate.exchange(url, method, entity, responseType);
      }
  }
  ```

### Distributed Tracing
- **Importance of tracing in microservices:**
  - Understanding request flow across services
  - Identifying performance bottlenecks
  - Debugging distributed failures
  - Monitoring service dependencies

- **Implementing distributed tracing with Spring Cloud Sleuth:**
  - Automatic trace ID generation and propagation
  - Span creation for operations
  - Baggage for custom context propagation
  - Integration with logging frameworks

- **Integrating with Zipkin for trace visualization:**
  - Zipkin server setup and configuration
  - Trace collection and storage
  - UI for visualizing traces and spans
  - Dependencies graph

- **Correlating requests across service boundaries:**
  - Trace ID and span ID propagation
  - HTTP headers for trace context
  - Message headers for async communication
  - Custom correlation IDs

- **Debugging and monitoring request flows:**
  - Log correlation with trace IDs
  - Error tracing and root cause analysis
  - Performance monitoring per service
  - Alerting on slow traces

  ```java
  // Sleuth Configuration
  @SpringBootApplication
  @EnableEurekaClient
  public class OrderServiceApplication {
      
      public static void main(String[] args) {
          SpringApplication.run(OrderServiceApplication.class, args);
      }
      
      // Sleuth automatically instruments Spring components
  }

  // application.yml for Sleuth and Zipkin
  spring:
    application:
      name: order-service
    sleuth:
      sampler:
        probability: 1.0  # Sample all requests (for development)
    zipkin:
      base-url: http://zipkin-server:9411/
      sender:
        type: web  # Send traces via HTTP

  logging:
    pattern:
      level: "%5p [${spring.application.name:},%X{traceId:-},%X{spanId:-}]"

  // Service with Custom Tracing
  @Service
  public class OrderService {
      
      private static final Logger logger = LoggerFactory.getLogger(OrderService.class);
      
      @Autowired
      private Tracer tracer;
      
      @Autowired
      private ProductServiceClient productClient;
      
      @Autowired
      private PaymentServiceClient paymentClient;
      
      @NewSpan("createOrder")
      public OrderDTO createOrder(@SpanTag("userId") Long userId, CreateOrderRequest request) {
          logger.info("Creating order for user: {}", userId);
          
          Span productSpan = tracer.nextSpan().name("getProduct").start();
          try (Tracer.SpanInScope ws = tracer.withSpanInScope(productSpan)) {
              ProductDTO product = productClient.getProduct(request.getProductId());
              logger.info("Retrieved product: {}", product.getName());
          } finally {
              productSpan.end();
          }
          
          Span paymentSpan = tracer.nextSpan().name("processPayment").start();
          try (Tracer.SpanInScope ws = tracer.withSpanInScope(paymentSpan)) {
              PaymentResponse payment = paymentClient.processPayment(request.getPaymentInfo());
              logger.info("Payment processed: {}", payment.isSuccessful());
              
              if (!payment.isSuccessful()) {
                  throw new PaymentFailedException("Payment failed");
              }
          } finally {
              paymentSpan.end();
          }
          
          // Create order entity
          Order order = new Order();
          order.setUserId(userId);
          order.setProductId(request.getProductId());
          order.setQuantity(request.getQuantity());
          order.setStatus(OrderStatus.CONFIRMED);
          
          Order saved = orderRepository.save(order);
          logger.info("Order created with ID: {}", saved.getId());
          
          return mapToDTO(saved);
      }
      
      @NewSpan("cancelOrder")
      public void cancelOrder(@SpanTag("orderId") Long orderId) {
          logger.info("Cancelling order: {}", orderId);
          
          Order order = orderRepository.findById(orderId)
              .orElseThrow(() -> new OrderNotFoundException("Order not found"));
          
          // Add tags to current span
          Span currentSpan = tracer.currentSpan();
          if (currentSpan != null) {
              currentSpan.tag("order.status", order.getStatus().toString());
              currentSpan.tag("order.userId", order.getUserId().toString());
          }
          
          order.setStatus(OrderStatus.CANCELLED);
          orderRepository.save(order);
          
          logger.info("Order cancelled successfully");
      }
  }

  // Custom Span Configuration
  @Configuration
  public class TracingConfig {
      
      @Bean
      public SpanCustomizer spanCustomizer() {
          return span -> {
              // Add custom tags to all spans
              span.tag("service.version", "1.0.0");
              span.tag("environment", "development");
          };
      }
  }

  // Async Tracing (for Kafka)
  @Service
  public class OrderEventConsumer {
      
      @Autowired
      private Tracer tracer;
      
      @KafkaListener(topics = "order-events", groupId = "order-service")
      public void handleOrderEvent(OrderEvent event, @Header(KafkaHeaders.RECEIVED_MESSAGE_KEY) String key) {
          
          // Extract trace context from message headers
          SpanContext spanContext = tracer.extract(Format.Builtin.TEXT_MAP,
              new KafkaMessageHeadersTextMapExtractor(key));
          
          Span span = tracer.nextSpan().name("handleOrderEvent").asChildOf(spanContext).start();
          
          try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
              span.tag("event.type", event.getEventType());
              span.tag("order.id", event.getOrderId().toString());
              
              // Process the event
              processOrderEvent(event);
              
          } finally {
              span.end();
          }
      }
      
      private void processOrderEvent(OrderEvent event) {
          // Event processing logic
      }
  }
  ```

### Monitoring and Metrics
- **Exposing health endpoints with Spring Boot Actuator:**
  - Built-in health checks
  - Custom health indicators
  - Application metrics endpoints
  - Environment and configuration info

- **Collecting metrics and application insights:**
  - JVM metrics, HTTP metrics, database metrics
  - Custom business metrics
  - Micrometer for metrics collection
  - Integration with monitoring systems

- **Integrating with Prometheus for metrics collection:**
  - Prometheus endpoint exposure
  - Metric naming conventions
  - Service discovery configuration
  - Query language (PromQL)

- **Visualizing data with Grafana dashboards:**
  - Dashboard creation and configuration
  - Custom panels and queries
  - Alerting rules
  - Template variables

- **Alerting and monitoring best practices:**
  - Key metrics to monitor (latency, error rate, throughput)
  - Alert thresholds and escalation
  - SLO/SLA monitoring
  - Incident response procedures

  ```java
  // Actuator Configuration
  @Configuration
  public class ActuatorConfig {
      
      @Bean
      public HealthIndicator dbHealthIndicator(DataSource dataSource) {
          return new DataSourceHealthIndicator(dataSource);
      }
      
      @Bean
      public HealthIndicator customHealthIndicator() {
          return new AbstractHealthIndicator() {
              @Override
              protected void doHealthCheck(Health.Builder builder) throws Exception {
                  // Custom health check logic
                  boolean serviceUp = checkExternalService();
                  
                  if (serviceUp) {
                      builder.up().withDetail("external-service", "available");
                  } else {
                      builder.down().withDetail("external-service", "unavailable");
                  }
              }
          };
      }
      
      private boolean checkExternalService() {
          // Implementation to check external service health
          return true;
      }
  }

  // application.yml for Actuator and Metrics
  management:
    endpoints:
      web:
        exposure:
          include: health,info,metrics,prometheus,circuitbreakers
    endpoint:
      health:
        show-details: when-authorized
    health:
      circuitbreakers:
        enabled: true
    metrics:
      export:
        prometheus:
          enabled: true
      tags:
        application: ${spring.application.name}

  // Custom Metrics
  @Service
  public class OrderService {
      
      @Autowired
      private MeterRegistry meterRegistry;
      
      private Counter ordersCreated;
      private Timer orderCreationTimer;
      private Gauge ordersInProgress;
      
      @PostConstruct
      public void initMetrics() {
          ordersCreated = Counter.builder("orders.created.total")
              .description("Total number of orders created")
              .register(meterRegistry);
          
          orderCreationTimer = Timer.builder("orders.creation.duration")
              .description("Time taken to create orders")
              .register(meterRegistry);
          
          ordersInProgress = Gauge.builder("orders.in.progress", this, service -> getOrdersInProgress())
              .description("Number of orders currently being processed")
              .register(meterRegistry);
      }
      
      public OrderDTO createOrder(CreateOrderRequest request) {
          ordersCreated.increment();
          
          return orderCreationTimer.recordCallable(() -> {
              // Order creation logic
              Order order = new Order();
              // ... set properties ...
              
              Order saved = orderRepository.save(order);
              
              // Update gauge
              updateOrdersInProgress();
              
              return mapToDTO(saved);
          });
      }
      
      private int getOrdersInProgress() {
          // Return count of orders in progress
          return 5; // placeholder
      }
      
      private void updateOrdersInProgress() {
          // Update the gauge value
      }
  }

  // Prometheus Configuration (prometheus.yml)
  global:
    scrape_interval: 15s

  scrape_configs:
    - job_name: 'spring-boot-app'
      metrics_path: '/actuator/prometheus'
      static_configs:
        - targets: ['localhost:8080', 'localhost:8081', 'localhost:8082']
      relabel_configs:
        - source_labels: [__address__]
          regex: '.*:(\d+)'
          target_label: 'port'
        - source_labels: [__address__]
          regex: '(.*):\d+'
          target_label: 'host'

  // Grafana Dashboard JSON (simplified)
  {
    "dashboard": {
      "title": "Microservices Dashboard",
      "panels": [
        {
          "title": "Order Creation Rate",
          "type": "graph",
          "targets": [
            {
              "expr": "rate(orders_created_total[5m])",
              "legendFormat": "Orders/min"
            }
          ]
        },
        {
          "title": "Order Creation Duration",
          "type": "graph",
          "targets": [
            {
              "expr": "histogram_quantile(0.95, rate(orders_creation_duration_bucket[5m]))",
              "legendFormat": "95th percentile"
            }
          ]
        },
        {
          "title": "Circuit Breaker Status",
          "type": "table",
          "targets": [
            {
              "expr": "resilience4j_circuitbreaker_state",
              "legendFormat": "{{name}}"
            }
          ]
        }
      ]
    }
  }
  ```

## Project: Production-Ready E-commerce Microservices
**Objective:** Enhance the e-commerce microservices with comprehensive resiliency, security, tracing, and monitoring capabilities for production deployment.

**Requirements:**
1. Implement circuit breakers, retries, and bulkheads for fault tolerance
2. Add JWT-based authentication and OAuth2 authorization
3. Set up distributed tracing with Sleuth and Zipkin
4. Configure monitoring with Actuator, Prometheus, and Grafana
5. Implement rate limiting and security best practices
6. Add comprehensive logging and error handling

**Implementation Steps:**

**1. Resiliency Implementation:**
```java
// Add Resilience4j to all services
@Configuration
public class ResilienceConfig {
    // Circuit breakers for all external calls
    // Bulkheads for resource isolation
    // Time limiters for timeout handling
}
```

**2. Security Implementation:**
```java
// JWT authentication for user-facing APIs
// OAuth2 for third-party integrations
// Service-to-service authentication with client credentials
// API Gateway security filters
```

**3. Tracing Setup:**
```yaml
# docker-compose.yml additions
services:
  zipkin:
    image: openzipkin/zipkin
    ports:
      - "9411:9411"
```

**4. Monitoring Stack:**
```yaml
# docker-compose.yml for monitoring
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

**5. Alerting Rules:**
```yaml
# Prometheus alerting rules
groups:
  - name: microservices
    rules:
      - alert: HighErrorRate
        expr: rate(http_server_requests_seconds_count{status=~"5.."}[5m]) / rate(http_server_requests_seconds_count[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          
      - alert: CircuitBreakerOpen
        expr: resilience4j_circuitbreaker_state{state="OPEN"} == 1
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker is open"
```

**Deliverables:**
- Resilient services with comprehensive fault tolerance
- Secure APIs with authentication and authorization
- Complete tracing infrastructure with Zipkin
- Monitoring dashboards and alerting rules
- Documentation for security policies and monitoring procedures
- Performance benchmarks and chaos testing results

## Learning Outcomes
By the end of this module, students will be able to:
- Implement comprehensive fault tolerance patterns in microservices
- Secure microservices with JWT, OAuth2, and Keycloak
- Set up distributed tracing and debugging capabilities
- Configure monitoring and alerting for production systems
- Apply security best practices in distributed architectures
- Troubleshoot and optimize microservices performance
- Implement observability patterns for cloud-native applications

## Resources
- "Release It!" by Michael T. Nygard (Resiliency patterns)
- "Microservices Security in Action" by Prabath Siriwardena and Nuwan Dias
- "Distributed Tracing in Practice" by Austin Parker et al.
- Spring Boot Actuator Documentation
- Prometheus and Grafana Documentation
- OAuth 2.0 Security Best Current Practice (RFC 8725)