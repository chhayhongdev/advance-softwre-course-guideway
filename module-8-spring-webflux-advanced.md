# Module 8: Spring WebFlux Advanced

## Overview
This module dives deep into advanced Spring WebFlux concepts, covering reactive security, real-time communication with WebSockets and RSocket, performance optimization, testing strategies, and integration patterns for building enterprise-grade reactive applications.

## Topics

### Reactive Security with Spring Security
- **Reactive Security Configuration:**
  - SecurityWebFilterChain
  - Reactive authentication and authorization
  - JWT with reactive flows
  
  ```java
  import org.springframework.context.annotation.Bean;
  import org.springframework.context.annotation.Configuration;
  import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
  import org.springframework.security.config.web.server.ServerHttpSecurity;
  import org.springframework.security.core.userdetails.ReactiveUserDetailsService;
  import org.springframework.security.crypto.password.PasswordEncoder;
  import org.springframework.security.web.server.SecurityWebFilterChain;
  
  @Configuration
  @EnableWebFluxSecurity
  public class SecurityConfig {
      
      @Bean
      public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
          return http
              .csrf().disable()
              .authorizeExchange(exchanges -> exchanges
                  .pathMatchers("/api/public/**").permitAll()
                  .pathMatchers("/api/admin/**").hasRole("ADMIN")
                  .pathMatchers("/api/user/**").hasRole("USER")
                  .anyExchange().authenticated()
              )
              .httpBasic(withDefaults())
              .formLogin(withDefaults())
              .build();
      }
      
      @Bean
      public ReactiveUserDetailsService userDetailsService(UserRepository userRepository) {
          return username -> userRepository.findByUsername(username)
                                         .map(user -> User.withUsername(user.getUsername())
                                                        .password(user.getPassword())
                                                        .roles(user.getRoles().toArray(new String[0]))
                                                        .build());
      }
      
      @Bean
      public PasswordEncoder passwordEncoder() {
          return new BCryptPasswordEncoder();
      }
  }
  
  // JWT Reactive Authentication
  @Component
  public class JwtAuthenticationManager implements ReactiveAuthenticationManager {
      
      private final JwtUtil jwtUtil;
      private final ReactiveUserDetailsService userDetailsService;
      
      public JwtAuthenticationManager(JwtUtil jwtUtil, ReactiveUserDetailsService userDetailsService) {
          this.jwtUtil = jwtUtil;
          this.userDetailsService = userDetailsService;
      }
      
      @Override
      public Mono<Authentication> authenticate(Authentication authentication) {
          String token = authentication.getCredentials().toString();
          
          return Mono.just(jwtUtil.extractUsername(token))
                     .flatMap(username -> userDetailsService.findByUsername(username))
                     .map(userDetails -> {
                         if (jwtUtil.validateToken(token, userDetails)) {
                             return new UsernamePasswordAuthenticationToken(
                                 userDetails, token, userDetails.getAuthorities());
                         } else {
                             throw new BadCredentialsException("Invalid token");
                         }
                     });
      }
  }
  
  // JWT Utility
  @Component
  public class JwtUtil {
      
      @Value("${jwt.secret}")
      private String secret;
      
      @Value("${jwt.expiration}")
      private Long expiration;
      
      public String generateToken(UserDetails userDetails) {
          Map<String, Object> claims = new HashMap<>();
          claims.put("roles", userDetails.getAuthorities().stream()
                                        .map(GrantedAuthority::getAuthority)
                                        .collect(Collectors.toList()));
          
          return Jwts.builder()
                     .setClaims(claims)
                     .setSubject(userDetails.getUsername())
                     .setIssuedAt(new Date())
                     .setExpiration(new Date(System.currentTimeMillis() + expiration * 1000))
                     .signWith(SignatureAlgorithm.HS512, secret)
                     .compact();
      }
      
      public String extractUsername(String token) {
          return extractClaim(token, Claims::getSubject);
      }
      
      public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
          final Claims claims = extractAllClaims(token);
          return claimsResolver.apply(claims);
      }
      
      private Claims extractAllClaims(String token) {
          return Jwts.parser().setSigningKey(secret).parseClaimsJws(token).getBody();
      }
      
      public Boolean validateToken(String token, UserDetails userDetails) {
          final String username = extractUsername(token);
          return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
      }
      
      private Boolean isTokenExpired(String token) {
          return extractExpiration(token).before(new Date());
      }
      
      public Date extractExpiration(String token) {
          return extractClaim(token, Claims::getExpiration);
      }
  }
  ```

### Real-Time Communication with WebSockets
- **Reactive WebSocket Handler:**
  - WebSocketSession and WebSocketMessage
  - Bidirectional communication
  - Message broadcasting
  
  ```java
  import org.springframework.web.reactive.socket.WebSocketHandler;
  import org.springframework.web.reactive.socket.WebSocketMessage;
  import org.springframework.web.reactive.socket.WebSocketSession;
  import reactor.core.publisher.Flux;
  import reactor.core.publisher.Mono;
  import reactor.core.publisher.Sinks;
  
  @Component
  public class ChatWebSocketHandler implements WebSocketHandler {
      
      private final Sinks.Many<String> chatSink = Sinks.many().multicast().onBackpressureBuffer();
      
      @Override
      public Mono<Void> handle(WebSocketSession session) {
          String username = extractUsername(session);
          
          // Handle incoming messages
          Flux<WebSocketMessage> output = session.receive()
              .map(WebSocketMessage::getPayloadAsText)
              .map(message -> username + ": " + message)
              .doOnNext(chatSink::tryEmitNext)
              .thenMany(Flux.empty());
          
          // Send messages to client
          Flux<WebSocketMessage> input = chatSink.asFlux()
              .map(session::textMessage);
          
          return session.send(input).and(output);
      }
      
      private String extractUsername(WebSocketSession session) {
          // Extract username from session attributes or headers
          return session.getHandshakeInfo().getHeaders()
                       .getFirst("username") != null ? 
                       session.getHandshakeInfo().getHeaders().getFirst("username") : 
                       "Anonymous";
      }
  }
  
  // WebSocket Configuration
  @Configuration
  public class WebSocketConfig {
      
      @Bean
      public HandlerMapping webSocketMapping(ChatWebSocketHandler handler) {
          Map<String, WebSocketHandler> map = new HashMap<>();
          map.put("/ws/chat", handler);
          return new SimpleUrlHandlerMapping(map, -1);
      }
      
      @Bean
      public WebSocketHandlerAdapter handlerAdapter() {
          return new WebSocketHandlerAdapter();
      }
  }
  
  // Advanced WebSocket with Rooms
  @Component
  public class RoomWebSocketHandler implements WebSocketHandler {
      
      private final Map<String, Sinks.Many<String>> roomSinks = new ConcurrentHashMap<>();
      
      @Override
      public Mono<Void> handle(WebSocketSession session) {
          String roomId = extractRoomId(session);
          String username = extractUsername(session);
          
          // Get or create room sink
          Sinks.Many<String> roomSink = roomSinks.computeIfAbsent(roomId, 
              k -> Sinks.many().multicast().onBackpressureBuffer());
          
          // Handle incoming messages
          Flux<WebSocketMessage> output = session.receive()
              .map(WebSocketMessage::getPayloadAsText)
              .map(message -> username + ": " + message)
              .doOnNext(message -> {
                  roomSink.tryEmitNext(message);
                  System.out.println("Message in room " + roomId + ": " + message);
              })
              .thenMany(Flux.empty());
          
          // Send room messages to client
          Flux<WebSocketMessage> input = roomSink.asFlux()
              .map(session::textMessage);
          
          // Cleanup on disconnect
          return session.send(input)
                       .and(output)
                       .doFinally(signalType -> {
                           // Optional: remove empty rooms
                           if (roomSink.currentSubscriberCount() == 0) {
                               roomSinks.remove(roomId);
                           }
                       });
      }
      
      private String extractRoomId(WebSocketSession session) {
          return session.getHandshakeInfo().getUri().getQuery();
      }
      
      private String extractUsername(WebSocketSession session) {
          return session.getHandshakeInfo().getHeaders().getFirst("username");
      }
  }
  ```

### RSocket for Reactive Communication
- **RSocket Protocol:**
  - Fire-and-Forget, Request-Response, Request-Stream, Channel
  - Connection establishment and routing
  - Load balancing and resilience
  
  ```java
  import io.rsocket.RSocket;
  import io.rsocket.core.RSocketConnector;
  import io.rsocket.transport.netty.client.TcpClientTransport;
  import io.rsocket.util.DefaultPayload;
  import reactor.core.publisher.Flux;
  import reactor.core.publisher.Mono;
  
  // RSocket Client
  @Service
  public class ProductRSocketClient {
      
      private final RSocket rSocket;
      
      public ProductRSocketClient() {
          this.rSocket = RSocketConnector.create()
              .connect(TcpClientTransport.create("localhost", 7000))
              .block();
      }
      
      // Fire-and-Forget
      public Mono<Void> createProductNotification(Product product) {
          return rSocket.fireAndForget(DefaultPayload.create(
              objectMapper.writeValueAsString(product)));
      }
      
      // Request-Response
      public Mono<Product> getProduct(String id) {
          return rSocket.requestResponse(DefaultPayload.create(id))
                       .map(payload -> objectMapper.readValue(
                           payload.getDataUtf8(), Product.class));
      }
      
      // Request-Stream
      public Flux<Product> getAllProducts() {
          return rSocket.requestStream(DefaultPayload.create(""))
                       .map(payload -> objectMapper.readValue(
                           payload.getDataUtf8(), Product.class));
      }
      
      // Channel (bidirectional)
      public Flux<String> chatWithServer(Flux<String> messages) {
          return rSocket.requestChannel(
              messages.map(message -> DefaultPayload.create(message)))
              .map(payload -> payload.getDataUtf8());
      }
  }
  
  // RSocket Server
  @Configuration
  public class RSocketConfig {
      
      @Bean
      public RSocketMessageHandler messageHandler(RSocketStrategies strategies) {
          RSocketMessageHandler handler = new RSocketMessageHandler();
          handler.setRSocketStrategies(strategies);
          return handler;
      }
      
      @Bean
      public RouterFunction<RSocket> rSocketRouter(ProductService productService) {
          return RSocketMessageHandler.responder(routes -> routes
              .route(RequestMapping.of("products.get"), 
                    request -> productService.getAllProducts()
                                           .map(product -> DefaultPayload.create(
                                               objectMapper.writeValueAsString(product))))
              .route(RequestMapping.of("product.get.{id}"), 
                    request -> productService.getProductById(request.pathVariable("id"))
                                           .map(product -> DefaultPayload.create(
                                               objectMapper.writeValueAsString(product))))
              .route(RequestMapping.of("product.create"), 
                    request -> request.bodyToMono(Product.class)
                                    .flatMap(productService::createProduct)
                                    .map(product -> DefaultPayload.create(
                                        objectMapper.writeValueAsString(product)))));
      }
  }
  
  // RSocket Controller
  @Controller
  public class ProductRSocketController {
      
      private final ProductService productService;
      
      public ProductRSocketController(ProductService productService) {
          this.productService = productService;
      }
      
      @MessageMapping("products.stream")
      public Flux<Product> streamProducts() {
          return productService.getAllProducts()
                              .delayElements(Duration.ofMillis(100));
      }
      
      @MessageMapping("product.get")
      public Mono<Product> getProduct(@Payload String productId) {
          return productService.getProductById(productId);
      }
      
      @MessageMapping("product.create")
      public Mono<Product> createProduct(@Payload Product product) {
          return productService.createProduct(product);
      }
      
      @MessageMapping("products.channel")
      public Flux<Product> channelProducts(Flux<String> categories) {
          return categories
              .flatMap(category -> productService.getProductsByCategory(category))
              .distinct(product -> product.getId());
      }
  }
  ```

### Reactive Integration Patterns
- **Circuit Breaker with Resilience4j:**
  - Reactive circuit breaker
  - Bulkhead pattern
  - Rate limiting
  
  ```java
  import io.github.resilience4j.circuitbreaker.CircuitBreaker;
  import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
  import io.github.resilience4j.reactor.circuitbreaker.operator.CircuitBreakerOperator;
  import io.github.resilience4j.bulkhead.Bulkhead;
  import io.github.resilience4j.bulkhead.BulkheadRegistry;
  import io.github.resilience4j.reactor.bulkhead.operator.BulkheadOperator;
  
  @Service
  public class ProductService {
      
      private final ProductRepository productRepository;
      private final CircuitBreaker circuitBreaker;
      private final Bulkhead bulkhead;
      
      public ProductService(ProductRepository productRepository, 
                           CircuitBreakerRegistry circuitBreakerRegistry,
                           BulkheadRegistry bulkheadRegistry) {
          this.productRepository = productRepository;
          this.circuitBreaker = circuitBreakerRegistry.circuitBreaker("productService");
          this.bulkhead = bulkheadRegistry.bulkhead("productService");
      }
      
      public Mono<Product> getProductById(String id) {
          return Mono.fromCallable(() -> productRepository.findById(id).block())
                     .transformDeferred(CircuitBreakerOperator.of(circuitBreaker))
                     .transformDeferred(BulkheadOperator.of(bulkhead))
                     .onErrorResume(throwable -> {
                         if (circuitBreaker.getState() == CircuitBreaker.State.OPEN) {
                             return Mono.error(new ServiceUnavailableException("Service temporarily unavailable"));
                         }
                         return Mono.error(throwable);
                     });
      }
      
      public Flux<Product> getAllProducts() {
          return Flux.defer(() -> Flux.fromIterable(productRepository.findAll().collectList().block()))
                     .transformDeferred(CircuitBreakerOperator.of(circuitBreaker))
                     .transformDeferred(BulkheadOperator.of(bulkhead));
      }
  }
  
  // Resilience4j Configuration
  @Configuration
  public class ResilienceConfig {
      
      @Bean
      public CircuitBreakerRegistry circuitBreakerRegistry() {
          CircuitBreakerConfig config = CircuitBreakerConfig.custom()
              .failureRateThreshold(50)
              .waitDurationInOpenState(Duration.ofMillis(1000))
              .slidingWindowSize(10)
              .build();
          
          return CircuitBreakerRegistry.of(config);
      }
      
      @Bean
      public BulkheadRegistry bulkheadRegistry() {
          BulkheadConfig config = BulkheadConfig.custom()
              .maxConcurrentCalls(10)
              .maxWaitDuration(Duration.ofMillis(500))
              .build();
          
          return BulkheadRegistry.of(config);
      }
  }
  ```

- **Reactive Messaging with Kafka:**
  - Reactive Kafka consumer and producer
  - Message processing pipelines
  - Error handling and retries
  
  ```java
  import org.springframework.kafka.core.reactive.ReactiveKafkaConsumerTemplate;
  import org.springframework.kafka.core.reactive.ReactiveKafkaProducerTemplate;
  import reactor.kafka.receiver.ReceiverRecord;
  import reactor.kafka.sender.SenderRecord;
  
  @Service
  public class ProductEventService {
      
      private final ReactiveKafkaConsumerTemplate<String, ProductEvent> consumerTemplate;
      private final ReactiveKafkaProducerTemplate<String, ProductEvent> producerTemplate;
      
      public ProductEventService(
              ReactiveKafkaConsumerTemplate<String, ProductEvent> consumerTemplate,
              ReactiveKafkaProducerTemplate<String, ProductEvent> producerTemplate) {
          this.consumerTemplate = consumerTemplate;
          this.producerTemplate = producerTemplate;
      }
      
      // Consume events reactively
      public Flux<ProductEvent> consumeProductEvents() {
          return consumerTemplate.receive()
              .doOnNext(record -> {
                  System.out.println("Received event: " + record.value());
                  record.receiverOffset().acknowledge();
              })
              .map(ReceiverRecord::value)
              .doOnError(error -> System.err.println("Error consuming: " + error.getMessage()))
              .retry(3)
              .onErrorContinue((error, obj) -> System.err.println("Error after retries: " + error.getMessage()));
      }
      
      // Produce events reactively
      public Mono<Void> publishProductEvent(ProductEvent event) {
          SenderRecord<String, ProductEvent, String> record = 
              SenderRecord.create("product-events", event.getProductId(), event, event.getProductId());
          
          return producerTemplate.send(record)
                                .doOnNext(result -> System.out.println("Event sent: " + event))
                                .doOnError(error -> System.err.println("Error sending: " + error.getMessage()))
                                .then();
      }
      
      // Process events in pipeline
      public Flux<ProductEvent> processProductEvents() {
          return consumeProductEvents()
              .filter(event -> event.getType() == ProductEventType.CREATED)
              .map(this::enrichEvent)
              .flatMap(this::validateEvent)
              .doOnNext(this::saveEvent)
              .onErrorContinue((error, event) -> {
                  System.err.println("Error processing event " + event + ": " + error.getMessage());
                  // Send to dead letter topic
                  publishDeadLetterEvent(event, error);
              });
      }
      
      private ProductEvent enrichEvent(ProductEvent event) {
          event.setProcessedAt(LocalDateTime.now());
          event.setProcessor("ProductEventService");
          return event;
      }
      
      private Mono<ProductEvent> validateEvent(ProductEvent event) {
          if (event.getProductId() == null || event.getProductId().isEmpty()) {
              return Mono.error(new IllegalArgumentException("Product ID cannot be null"));
          }
          return Mono.just(event);
      }
      
      private void saveEvent(ProductEvent event) {
          // Save to database or perform business logic
          System.out.println("Processing event: " + event);
      }
      
      private void publishDeadLetterEvent(ProductEvent event, Throwable error) {
          // Publish to dead letter topic for manual processing
          ProductEvent deadLetterEvent = new ProductEvent();
          deadLetterEvent.setOriginalEvent(event);
          deadLetterEvent.setErrorMessage(error.getMessage());
          deadLetterEvent.setDeadLetterTopic(true);
          
          publishProductEvent(deadLetterEvent).subscribe();
      }
  }
  ```

### Performance Optimization and Monitoring
- **Reactive Performance Tuning:**
  - Connection pooling
  - Backpressure handling
  - Memory management
  
  ```java
  import io.r2dbc.pool.ConnectionPool;
  import io.r2dbc.pool.ConnectionPoolConfiguration;
  import io.r2dbc.postgresql.PostgresqlConnectionConfiguration;
  import io.r2dbc.postgresql.PostgresqlConnectionFactory;
  
  @Configuration
  public class DatabaseConfig {
      
      @Bean
      public ConnectionFactory connectionFactory() {
          PostgresqlConnectionConfiguration config = PostgresqlConnectionConfiguration.builder()
              .host("localhost")
              .port(5432)
              .database("productdb")
              .username("user")
              .password("password")
              .build();
          
          ConnectionPoolConfiguration poolConfig = ConnectionPoolConfiguration.builder()
              .connectionFactory(new PostgresqlConnectionFactory(config))
              .name("product-db-pool")
              .initialSize(10)
              .maxSize(50)
              .maxIdleTime(Duration.ofMinutes(30))
              .validationQuery("SELECT 1")
              .build();
          
          return new ConnectionPool(poolConfig);
      }
  }
  
  // Reactive Repository with performance considerations
  public interface ProductRepository extends ReactiveCrudRepository<Product, String>, ReactiveQueryByExampleExecutor<Product> {
      
      @Query("SELECT p FROM Product p WHERE p.category = :category")
      Flux<Product> findByCategoryPaged(@Param("category") String category, Pageable pageable);
      
      @Query("SELECT COUNT(p) FROM Product p WHERE p.category = :category")
      Mono<Long> countByCategory(@Param("category") String category);
  }
  
  // Service with pagination and performance optimization
  @Service
  public class OptimizedProductService {
      
      private final ProductRepository productRepository;
      
      public OptimizedProductService(ProductRepository productRepository) {
          this.productRepository = productRepository;
      }
      
      public Flux<Product> getProductsByCategory(String category, int page, int size) {
          Pageable pageable = PageRequest.of(page, size);
          return productRepository.findByCategoryPaged(category, pageable)
                                 .delayElements(Duration.ofMillis(10)) // Simulate processing time
                                 .onBackpressureBuffer(100); // Handle backpressure
      }
      
      public Mono<Page<Product>> getProductsPage(String category, int page, int size) {
          Flux<Product> products = getProductsByCategory(category, page, size);
          Mono<Long> totalCount = productRepository.countByCategory(category);
          
          return Mono.zip(products.collectList(), totalCount)
                     .map(tuple -> new PageImpl<>(tuple.getT1(), PageRequest.of(page, size), tuple.getT2()));
      }
  }
  ```

- **Reactive Monitoring with Micrometer:**
  - Metrics collection
  - Custom metrics
  - Integration with monitoring systems
  
  ```java
  import io.micrometer.core.instrument.Counter;
  import io.micrometer.core.instrument.MeterRegistry;
  import io.micrometer.core.instrument.Timer;
  
  @Service
  public class MonitoredProductService {
      
      private final ProductRepository productRepository;
      private final Counter productCreatedCounter;
      private final Counter productRetrievedCounter;
      private final Timer productCreationTimer;
      
      public MonitoredProductService(ProductRepository productRepository, MeterRegistry registry) {
          this.productRepository = productRepository;
          
          // Counters for tracking operations
          this.productCreatedCounter = Counter.builder("product.created")
                                             .description("Number of products created")
                                             .register(registry);
          
          this.productRetrievedCounter = Counter.builder("product.retrieved")
                                               .description("Number of products retrieved")
                                               .register(registry);
          
          // Timer for measuring operation duration
          this.productCreationTimer = Timer.builder("product.creation.time")
                                          .description("Time taken to create products")
                                          .register(registry);
      }
      
      public Mono<Product> createProduct(Product product) {
          return Mono.fromCallable(() -> {
              long startTime = System.nanoTime();
              try {
                  Product savedProduct = productRepository.save(product).block();
                  productCreatedCounter.increment();
                  
                  long endTime = System.nanoTime();
                  productCreationTimer.record(endTime - startTime, TimeUnit.NANOSECONDS);
                  
                  return savedProduct;
              } catch (Exception e) {
                  // Record error metrics
                  Counter.builder("product.creation.error")
                         .description("Number of product creation errors")
                         .register(registry)
                         .increment();
                  throw e;
              }
          });
      }
      
      public Mono<Product> getProductById(String id) {
          return productRepository.findById(id)
                                 .doOnNext(product -> productRetrievedCounter.increment())
                                 .doOnError(error -> {
                                     Counter.builder("product.retrieval.error")
                                            .description("Number of product retrieval errors")
                                            .register(registry)
                                            .increment();
                                 });
      }
      
      // Custom metrics for business logic
      public Flux<Product> getExpensiveProducts(double minPrice) {
          return productRepository.findByPriceGreaterThan(minPrice)
                                 .doOnSubscribe(subscription -> {
                                     Gauge.builder("product.expensive.query.active", () -> 1)
                                          .description("Number of active expensive product queries")
                                          .register(registry);
                                 })
                                 .doFinally(signalType -> {
                                     Gauge.builder("product.expensive.query.active", () -> 0)
                                          .register(registry);
                                 });
      }
  }
  ```

### Advanced Testing Strategies
- **Integration Testing with TestContainers:**
  - Database integration tests
  - External service mocking
  - Full application testing
  
  ```java
  import org.junit.jupiter.api.Test;
  import org.springframework.boot.test.context.SpringBootTest;
  import org.springframework.test.context.DynamicPropertySource;
  import org.testcontainers.containers.MongoDBContainer;
  import org.testcontainers.junit.jupiter.Container;
  import org.testcontainers.junit.jupiter.Testcontainers;
  import reactor.test.StepVerifier;
  
  @SpringBootTest
  @Testcontainers
  public class ProductServiceIntegrationTest {
      
      @Container
      static MongoDBContainer mongoDBContainer = new MongoDBContainer("mongo:4.4");
      
      @DynamicPropertySource
      static void setProperties(DynamicPropertyRegistry registry) {
          registry.add("spring.data.mongodb.uri", mongoDBContainer::getReplicaSetUrl);
      }
      
      @Autowired
      private ProductService productService;
      
      @Test
      public void testCreateAndRetrieveProduct() {
          Product product = new Product(null, "Test Product", 99.99, "Test Category");
          
          // Test creation
          Mono<Product> createResult = productService.createProduct(product);
          
          StepVerifier.create(createResult)
                      .expectNextMatches(savedProduct -> 
                          savedProduct.getId() != null &&
                          "Test Product".equals(savedProduct.getName()))
                      .verifyComplete();
          
          // Test retrieval
          StepVerifier.create(createResult.flatMap(saved -> 
              productService.getProductById(saved.getId())))
                      .expectNextMatches(retrieved -> 
                          "Test Product".equals(retrieved.getName()) &&
                          99.99 == retrieved.getPrice())
                      .verifyComplete();
      }
      
      @Test
      public void testReactiveStreamOperations() {
          List<Product> products = Arrays.asList(
              new Product(null, "Product A", 10.0, "Category A"),
              new Product(null, "Product B", 20.0, "Category A"),
              new Product(null, "Product C", 30.0, "Category B")
          );
          
          // Create products
          Flux<Product> createFlux = Flux.fromIterable(products)
                                        .flatMap(productService::createProduct);
          
          // Test stream operations
          StepVerifier.create(createFlux)
                      .expectNextCount(3)
                      .verifyComplete();
          
          // Test filtering and mapping
          StepVerifier.create(productService.getAllProducts()
                                           .filter(p -> p.getPrice() > 15)
                                           .map(Product::getName))
                      .expectNext("Product B", "Product C")
                      .verifyComplete();
      }
  }
  ```

## Project: Advanced Reactive E-Commerce Platform
**Objective:** Build a comprehensive reactive e-commerce platform with real-time features, advanced security, and monitoring.

**Requirements:**
1. Reactive REST API with WebFlux
2. Real-time notifications with WebSockets
3. RSocket for service communication
4. Reactive security with JWT
5. Circuit breaker and resilience patterns
6. Reactive messaging with Kafka
7. Comprehensive monitoring and metrics
8. Integration testing with TestContainers

**Architecture Overview:**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │  Product Service │    │  Order Service  │
│   (WebFlux)     │◄──►│   (Reactive)     │◄──►│   (Reactive)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  WebSocket Hub  │    │   MongoDB       │    │   Kafka         │
│ (Real-time)     │    │   (Reactive)    │    │   (Events)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Learning Outcomes
By the end of this module, students will be able to:
- Implement reactive security with JWT authentication
- Build real-time applications with WebSockets and RSocket
- Apply resilience patterns (Circuit Breaker, Bulkhead) in reactive systems
- Integrate reactive messaging with Kafka
- Optimize reactive applications for performance
- Implement comprehensive monitoring and metrics
- Write advanced integration tests with TestContainers
- Design and build enterprise-grade reactive microservices

## Resources
- Spring Security Reactive Documentation: https://docs.spring.io/spring-security/reference/reactive/index.html
- RSocket Documentation: https://rsocket.io/docs/
- Resilience4j Documentation: https://resilience4j.readme.io/docs
- Micrometer Documentation: https://micrometer.io/docs
- TestContainers Documentation: https://www.testcontainers.org/</content>
<parameter name="filePath">/Users/chhayhong/Desktop/spring-boot-course/module-8-spring-webflux-advanced.md