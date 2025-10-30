# Module 6: Advanced Topics and Best Practices

## Overview
This module explores advanced patterns and best practices for building scalable, maintainable, and production-ready microservices. Students will learn about distributed transactions, event-driven architectures, cloud-native deployment strategies, comprehensive testing approaches, and performance optimization techniques essential for enterprise-grade applications.

## Topics

### Data Sagas
- **Challenges of distributed transactions in microservices:**
  - ACID properties in monolithic vs distributed systems
  - Two-phase commit (2PC) limitations in microservices
  - Network failures and partial transaction states
  - Data consistency vs availability trade-offs
  - Eventual consistency patterns

- **Saga pattern for managing distributed transactions:**
  - Saga as a sequence of local transactions
  - Compensating transactions for rollback
  - Saga orchestration vs choreography approaches
  - State management and saga logs
  - Idempotency and retry mechanisms

- **Implementing sagas with choreography and orchestration:**
  - Choreography: event-driven coordination
  - Orchestration: centralized saga coordinator
  - Event sourcing for saga state
  - Timeout handling and deadlock prevention
  - Monitoring and debugging sagas

- **Compensating transactions and rollback strategies:**
  - Designing reversible operations
  - Compensation action patterns
  - Partial rollback scenarios
  - Saga recovery and reconciliation
  - Business compensation vs technical rollback

- **Tools and frameworks for saga implementation:**
  - Axon Framework for CQRS and Sagas
  - Eventuate framework
  - Temporal workflow engine
  - Custom saga implementations
  - Integration with Spring Boot

  ```java
  // Saga Pattern Implementation with Axon Framework

  // Saga Definition
  @Saga
  public class OrderSaga {

      @Autowired
      private transient CommandGateway commandGateway;

      @Autowired
      private transient EventGateway eventGateway;

      private String orderId;
      private OrderStatus status;
      private BigDecimal totalAmount;
      private List<String> processedItems;

      @StartSaga
      @SagaEventHandler(associationProperty = "orderId")
      public void handle(OrderCreatedEvent event) {
          this.orderId = event.getOrderId();
          this.totalAmount = event.getTotalAmount();
          this.status = OrderStatus.PENDING;
          this.processedItems = new ArrayList<>();

          // Reserve inventory for each item
          for (OrderItem item : event.getItems()) {
              ReserveInventoryCommand command = new ReserveInventoryCommand(
                  item.getProductId(),
                  item.getQuantity(),
                  this.orderId
              );
              commandGateway.send(command);
          }
      }

      @SagaEventHandler(associationProperty = "orderId")
      public void handle(InventoryReservedEvent event) {
          processedItems.add(event.getProductId());

          // Check if all items are reserved
          if (processedItems.size() == getTotalItems()) {
              // Process payment
              ProcessPaymentCommand paymentCommand = new ProcessPaymentCommand(
                  this.orderId,
                  this.totalAmount
              );
              commandGateway.send(paymentCommand);
          }
      }

      @SagaEventHandler(associationProperty = "orderId")
      public void handle(InventoryReservationFailedEvent event) {
          // Compensate: release reserved inventory
          for (String productId : processedItems) {
              ReleaseInventoryCommand command = new ReleaseInventoryCommand(
                  productId,
                  this.orderId
              );
              commandGateway.send(command);
          }

          // Cancel order
          CancelOrderCommand cancelCommand = new CancelOrderCommand(this.orderId);
          commandGateway.send(cancelCommand);

          // End saga
          SagaLifecycle.end();
      }

      @SagaEventHandler(associationProperty = "orderId")
      public void handle(PaymentProcessedEvent event) {
          // Confirm order
          ConfirmOrderCommand command = new ConfirmOrderCommand(this.orderId);
          commandGateway.send(command);

          // Send order confirmation
          OrderConfirmedEvent confirmationEvent = new OrderConfirmedEvent(this.orderId);
          eventGateway.publish(confirmationEvent);

          // End saga successfully
          SagaLifecycle.end();
      }

      @SagaEventHandler(associationProperty = "orderId")
      public void handle(PaymentFailedEvent event) {
          // Compensate: release all reserved inventory
          for (String productId : processedItems) {
              ReleaseInventoryCommand command = new ReleaseInventoryCommand(
                  productId,
                  this.orderId
              );
              commandGateway.send(command);
          }

          // Cancel order
          CancelOrderCommand cancelCommand = new CancelOrderCommand(this.orderId);
          commandGateway.send(cancelCommand);

          // End saga
          SagaLifecycle.end();
      }

      private int getTotalItems() {
          // Return total number of items in order
          return 3; // placeholder
      }
  }

  // Commands
  public class ReserveInventoryCommand {
      private final String productId;
      private final int quantity;
      private final String orderId;

      // constructor, getters...
  }

  public class ProcessPaymentCommand {
      private final String orderId;
      private final BigDecimal amount;

      // constructor, getters...
  }

  public class ConfirmOrderCommand {
      private final String orderId;

      // constructor, getters...
  }

  public class CancelOrderCommand {
      private final String orderId;

      // constructor, getters...
  }

  public class ReleaseInventoryCommand {
      private final String productId;
      private final String orderId;

      // constructor, getters...
  }

  // Events
  public class OrderCreatedEvent {
      private final String orderId;
      private final List<OrderItem> items;
      private final BigDecimal totalAmount;

      // constructor, getters...
  }

  public class InventoryReservedEvent {
      private final String productId;
      private final String orderId;

      // constructor, getters...
  }

  public class InventoryReservationFailedEvent {
      private final String productId;
      private final String orderId;
      private final String reason;

      // constructor, getters...
  }

  public class PaymentProcessedEvent {
      private final String orderId;
      private final String transactionId;

      // constructor, getters...
  }

  public class PaymentFailedEvent {
      private final String orderId;
      private final String reason;

      // constructor, getters...
  }

  public class OrderConfirmedEvent {
      private final String orderId;

      // constructor, getters...
  }

  // Axon Configuration
  @Configuration
  public class AxonConfig {

      @Bean
      public SagaStore sagaStore(EntityManager entityManager) {
          return JpaSagaStore.builder()
              .entityManagerProvider(() -> entityManager)
              .build();
      }

      @Bean
      public CommandBus commandBus() {
          return SimpleCommandBus.builder().build();
      }

      @Bean
      public EventBus eventBus() {
          return SimpleEventBus.builder().build();
      }

      @Bean
      public EventStore eventStore() {
          return EmbeddedEventStore.builder()
              .storageEngine(new InMemoryEventStorageEngine())
              .build();
      }
  }

  // Aggregate Root
  @Aggregate
  public class OrderAggregate {

      @AggregateIdentifier
      private String orderId;
      private OrderStatus status;
      private List<OrderItem> items;
      private BigDecimal totalAmount;

      @CommandHandler
      public OrderAggregate(CreateOrderCommand command) {
          // Validate command
          if (command.getItems().isEmpty()) {
              throw new IllegalArgumentException("Order must have at least one item");
          }

          // Apply event
          OrderCreatedEvent event = new OrderCreatedEvent(
              command.getOrderId(),
              command.getItems(),
              command.getTotalAmount()
          );
          AggregateLifecycle.apply(event);
      }

      @EventSourcingHandler
      public void on(OrderCreatedEvent event) {
          this.orderId = event.getOrderId();
          this.items = event.getItems();
          this.totalAmount = event.getTotalAmount();
          this.status = OrderStatus.CREATED;
      }

      @CommandHandler
      public void handle(ConfirmOrderCommand command) {
          if (this.status != OrderStatus.PENDING) {
              throw new IllegalStateException("Order cannot be confirmed");
          }

          OrderConfirmedEvent event = new OrderConfirmedEvent(this.orderId);
          AggregateLifecycle.apply(event);
      }

      @EventSourcingHandler
      public void on(OrderConfirmedEvent event) {
          this.status = OrderStatus.CONFIRMED;
      }

      @CommandHandler
      public void handle(CancelOrderCommand command) {
          if (this.status == OrderStatus.CONFIRMED) {
              throw new IllegalStateException("Confirmed order cannot be cancelled");
          }

          OrderCancelledEvent event = new OrderCancelledEvent(this.orderId);
          AggregateLifecycle.apply(event);
      }

      @EventSourcingHandler
      public void on(OrderCancelledEvent event) {
          this.status = OrderStatus.CANCELLED;
      }

      // Default constructor for Axon
      protected OrderAggregate() {}
  }
  ```

## Best Practices

### API Versioning Strategies
- **URI versioning:**
  - `/api/v1/products`, `/api/v2/products`
  - Clear and explicit versioning
  - Easy to cache and route
  - Breaking changes are obvious

- **Header versioning:**
  - `Accept: application/vnd.api.v1+json`
  - `X-API-Version: 1`
  - Clean URIs, versioning in headers
  - Content negotiation approach

- **Media type versioning:**
  - Custom media types for versioning
  - Semantic versioning in media types
  - Hypermedia-driven versioning

  ```java
  // API Versioning with Spring Boot

  // URI Versioning
  @RestController
  @RequestMapping("/api")
  public class ProductController {

      @GetMapping("/v1/products")
      public ResponseEntity<List<ProductV1>> getProductsV1() {
          // Return V1 representation
          return ResponseEntity.ok(productService.getProductsV1());
      }

      @GetMapping("/v2/products")
      public ResponseEntity<List<ProductV2>> getProductsV2() {
          // Return V2 representation with additional fields
          return ResponseEntity.ok(productService.getProductsV2());
      }
  }

  // Header Versioning
  @RestController
  @RequestMapping("/api/products")
  public class ProductControllerV2 {

      @GetMapping
      public ResponseEntity<?> getProducts(
              @RequestHeader(value = "X-API-Version", defaultValue = "1") String apiVersion) {

          if ("2".equals(apiVersion)) {
              return ResponseEntity.ok(productService.getProductsV2());
          } else {
              return ResponseEntity.ok(productService.getProductsV1());
          }
      }
  }

  // Custom Media Type Versioning
  @RestController
  @RequestMapping("/api/products")
  public class ProductControllerV3 {

      @GetMapping(produces = "application/vnd.ecommerce.v1+json")
      public ResponseEntity<List<ProductV1>> getProductsV1() {
          return ResponseEntity.ok(productService.getProductsV1());
      }

      @GetMapping(produces = "application/vnd.ecommerce.v2+json")
      public ResponseEntity<List<ProductV2>> getProductsV2() {
          return ResponseEntity.ok(productService.getProductsV2());
      }
  }

  // Version DTOs
  public class ProductV1 {
      private String id;
      private String name;
      private BigDecimal price;

      // getters, setters
  }

  public class ProductV2 {
      private String id;
      private String name;
      private BigDecimal price;
      private String category;
      private List<String> tags;

      // getters, setters
  }
  ```

### Event Sourcing and CQRS
- **Event Sourcing:**
  - Storing state changes as events
  - Rebuilding state from event history
  - Audit trail and temporal queries
  - Event replay for debugging

- **CQRS (Command Query Responsibility Segregation):**
  - Separate read and write models
  - Optimized data models for specific use cases
  - Eventual consistency between models
  - Scalability and performance benefits

  ```java
  // Event Sourcing with Axon Framework

  // Event Store Configuration
  @Configuration
  public class EventStoreConfig {

      @Bean
      public EventStorageEngine eventStorageEngine() {
          return new JpaEventStorageEngine();
      }

      @Bean
      public EventStore eventStore(EventStorageEngine eventStorageEngine) {
          return EmbeddedEventStore.builder()
              .storageEngine(eventStorageEngine)
              .build();
      }
  }

  // Domain Events
  public abstract class BaseEvent<T> {
      private final T id;
      private final int version;

      protected BaseEvent(T id, int version) {
          this.id = id;
          this.version = version;
      }

      public T getId() { return id; }
      public int getVersion() { return version; }
  }

  public class ProductCreatedEvent extends BaseEvent<String> {
      private final String name;
      private final BigDecimal price;
      private final String category;

      public ProductCreatedEvent(String id, String name, BigDecimal price, String category) {
          super(id, 1);
          this.name = name;
          this.price = price;
          this.category = category;
      }

      // getters
  }

  public class ProductPriceChangedEvent extends BaseEvent<String> {
      private final BigDecimal newPrice;
      private final BigDecimal oldPrice;

      public ProductPriceChangedEvent(String id, BigDecimal newPrice, BigDecimal oldPrice, int version) {
          super(id, version);
          this.newPrice = newPrice;
          this.oldPrice = oldPrice;
      }

      // getters
  }

  // Aggregate with Event Sourcing
  @Aggregate
  public class ProductAggregate {

      @AggregateIdentifier
      private String productId;
      private String name;
      private BigDecimal price;
      private String category;
      private boolean active;

      @CommandHandler
      public ProductAggregate(CreateProductCommand command) {
          apply(new ProductCreatedEvent(
              command.getProductId(),
              command.getName(),
              command.getPrice(),
              command.getCategory()
          ));
      }

      @EventSourcingHandler
      public void on(ProductCreatedEvent event) {
          this.productId = event.getId();
          this.name = event.getName();
          this.price = event.getPrice();
          this.category = event.getCategory();
          this.active = true;
      }

      @CommandHandler
      public void handle(ChangeProductPriceCommand command) {
          if (!this.active) {
              throw new IllegalStateException("Cannot change price of inactive product");
          }

          apply(new ProductPriceChangedEvent(
              this.productId,
              command.getNewPrice(),
              this.price,
              getVersion()
          ));
      }

      @EventSourcingHandler
      public void on(ProductPriceChangedEvent event) {
          this.price = event.getNewPrice();
      }

      // Helper method to get current version
      private int getVersion() {
          return AggregateLifecycle.getVersion();
      }

      protected ProductAggregate() {} // Required by Axon
  }

  // CQRS - Separate Read and Write Models

  // Write Model (Commands)
  public interface ProductCommandService {
      void createProduct(CreateProductCommand command);
      void changeProductPrice(ChangeProductPriceCommand command);
  }

  // Read Model (Queries)
  public interface ProductQueryService {
      ProductView getProduct(String productId);
      List<ProductView> getProductsByCategory(String category);
      List<ProductView> getActiveProducts();
  }

  // Read Model View
  public class ProductView {
      private String productId;
      private String name;
      private BigDecimal price;
      private String category;
      private boolean active;
      private LocalDateTime lastModified;

      // getters, setters
  }

  // Query Handlers
  @Component
  public class ProductQueryHandler {

      @Autowired
      private ProductViewRepository productViewRepository;

      @QueryHandler
      public ProductView handle(GetProductQuery query) {
          return productViewRepository.findById(query.getProductId())
              .orElseThrow(() -> new ProductNotFoundException(query.getProductId()));
      }

      @QueryHandler
      public List<ProductView> handle(GetProductsByCategoryQuery query) {
          return productViewRepository.findByCategoryAndActiveTrue(query.getCategory());
      }
  }

  // Event Handlers for Read Model Updates
  @Component
  @ProcessingGroup("product-view")
  public class ProductViewEventHandler {

      @Autowired
      private ProductViewRepository productViewRepository;

      @EventHandler
      public void on(ProductCreatedEvent event) {
          ProductView view = new ProductView();
          view.setProductId(event.getId());
          view.setName(event.getName());
          view.setPrice(event.getPrice());
          view.setCategory(event.getCategory());
          view.setActive(true);
          view.setLastModified(LocalDateTime.now());

          productViewRepository.save(view);
      }

      @EventHandler
      public void on(ProductPriceChangedEvent event) {
          ProductView view = productViewRepository.findById(event.getId())
              .orElseThrow(() -> new IllegalStateException("Product view not found"));

          view.setPrice(event.getNewPrice());
          view.setLastModified(LocalDateTime.now());

          productViewRepository.save(view);
      }
  }
  ```

### Cloud Deployment Strategies
- **AWS deployment:**
  - ECS (Elastic Container Service) for containers
  - EKS (Elastic Kubernetes Service) for Kubernetes
  - Lambda for serverless functions
  - API Gateway and ALB for routing

- **Google Cloud deployment:**
  - GKE (Google Kubernetes Engine)
  - Cloud Run for serverless containers
  - Cloud Functions for event-driven computing
  - Anthos for multi-cloud deployments

- **Azure deployment:**
  - AKS (Azure Kubernetes Service)
  - Container Instances for simple deployments
  - Functions for serverless computing
  - Application Gateway for routing

  ```yaml
  # AWS ECS Task Definition
  {
    "family": "ecommerce-product-service",
    "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
    "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "containerDefinitions": [
      {
        "name": "product-service",
        "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/product-service:latest",
        "essential": true,
        "portMappings": [
          {
            "containerPort": 8080,
            "protocol": "tcp"
          }
        ],
        "environment": [
          {
            "name": "SPRING_PROFILES_ACTIVE",
            "value": "aws"
          },
          {
            "name": "EUREKA_CLIENT_SERVICEURL_DEFAULTZONE",
            "value": "http://eureka-server:8761/eureka/"
          }
        ],
        "logConfiguration": {
          "logDriver": "awslogs",
          "options": {
            "awslogs-group": "/ecs/product-service",
            "awslogs-region": "us-east-1",
            "awslogs-stream-prefix": "ecs"
          }
        },
        "healthCheck": {
          "command": ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health || exit 1"],
          "interval": 30,
          "timeout": 5,
          "retries": 3,
          "startPeriod": 60
        }
      }
    ]
  }

  # Kubernetes Deployment for Cloud
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: product-service
    namespace: ecommerce
    labels:
      app: product-service
  spec:
    replicas: 3
    selector:
      matchLabels:
        app: product-service
    template:
      metadata:
        labels:
          app: product-service
      spec:
        serviceAccountName: ecommerce-service-account
        containers:
        - name: product-service
          image: gcr.io/my-project/product-service:latest
          ports:
          - containerPort: 8080
          env:
          - name: SPRING_PROFILES_ACTIVE
            value: "gcp"
          - name: EUREKA_CLIENT_SERVICEURL_DEFAULTZONE
            valueFrom:
              configMapKeyRef:
                name: service-discovery-config
                key: eureka-url
          resources:
            requests:
              memory: "256Mi"
              cpu: "200m"
            limits:
              memory: "512Mi"
              cpu: "400m"
          livenessProbe:
            httpGet:
              path: /actuator/health
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /actuator/health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          volumeMounts:
          - name: gcp-service-account
            mountPath: /var/secrets/google
        volumes:
        - name: gcp-service-account
          secret:
            secretName: gcp-service-account-key
  ---
  # Google Cloud Service Account
  apiVersion: v1
  kind: Secret
  metadata:
    name: gcp-service-account-key
    namespace: ecommerce
  type: Opaque
  data:
    key.json: <base64-encoded-service-account-key>
  ```

### Testing Strategies
- **Unit testing:**
  - Testing individual components in isolation
  - Mocking dependencies with Mockito
  - Test-driven development (TDD) approach

- **Integration testing:**
  - Testing component interactions
  - Database integration tests
  - External service integration

- **Contract testing:**
  - Consumer-driven contract tests
  - Pact framework for API contracts
  - Preventing breaking changes

  ```java
  // Comprehensive Testing Strategy

  // Unit Test with Mockito
  @ExtendWith(MockitoExtension.class)
  public class OrderServiceTest {

      @Mock
      private OrderRepository orderRepository;

      @Mock
      private ProductServiceClient productClient;

      @Mock
      private PaymentServiceClient paymentClient;

      @InjectMocks
      private OrderService orderService;

      @Test
      void shouldCreateOrderSuccessfully() {
          // Given
          CreateOrderRequest request = createOrderRequest();
          ProductDTO product = createProductDTO();
          PaymentResponse payment = createPaymentResponse(true);

          when(productClient.getProduct(request.getProductId())).thenReturn(product);
          when(paymentClient.processPayment(any(PaymentInfo.class))).thenReturn(payment);
          when(orderRepository.save(any(Order.class))).thenReturn(createOrder());

          // When
          OrderDTO result = orderService.createOrder(request);

          // Then
          assertThat(result).isNotNull();
          assertThat(result.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
          verify(orderRepository).save(any(Order.class));
      }

      @Test
      void shouldHandlePaymentFailure() {
          // Given
          CreateOrderRequest request = createOrderRequest();
          ProductDTO product = createProductDTO();
          PaymentResponse payment = createPaymentResponse(false);

          when(productClient.getProduct(request.getProductId())).thenReturn(product);
          when(paymentClient.processPayment(any(PaymentInfo.class))).thenReturn(payment);

          // When & Then
          assertThrows(PaymentFailedException.class, () -> orderService.createOrder(request));
          verify(orderRepository, never()).save(any(Order.class));
      }
  }

  // Integration Test with TestContainers
  @SpringBootTest
  @Testcontainers
  public class OrderServiceIntegrationTest {

      @Container
      static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
          .withDatabaseName("testdb")
          .withUsername("test")
          .withPassword("test");

      @Container
      static GenericContainer<?> eureka = new GenericContainer<>("ecommerce/eureka-server:latest")
          .withExposedPorts(8761);

      @Autowired
      private OrderService orderService;

      @Autowired
      private OrderRepository orderRepository;

      @DynamicPropertySource
      static void configureProperties(DynamicPropertyRegistry registry) {
          registry.add("spring.datasource.url", postgres::getJdbcUrl);
          registry.add("spring.datasource.username", postgres::getUsername);
          registry.add("spring.datasource.password", postgres::getPassword);
          registry.add("eureka.client.serviceUrl.defaultZone",
              () -> "http://" + eureka.getHost() + ":" + eureka.getMappedPort(8761) + "/eureka/");
      }

      @Test
      void shouldCreateOrderWithRealDatabase() {
          // Given
          CreateOrderRequest request = createOrderRequest();

          // When
          OrderDTO result = orderService.createOrder(request);

          // Then
          assertThat(result).isNotNull();
          assertThat(orderRepository.findById(result.getId())).isPresent();
      }
  }

  // Contract Test with Spring Cloud Contract
  @Test
  public class ProductServiceContractTest {

      @Autowired
      private ProductService productService;

      @Test
      public void validate_getProduct_contract() throws Exception {
          // Given
          String productId = "123";

          // When
          ProductDTO product = productService.getProduct(productId);

          // Then
          assertThat(product).isNotNull();
          assertThat(product.getId()).isEqualTo(productId);
          assertThat(product.getName()).isNotNull();
      }
  }

  // Pact Contract Test
  @Pact(provider = "product-service", consumer = "order-service")
  public RequestResponsePact getProductPact(PactDslWithProvider builder) {
      return builder
          .given("product exists")
          .uponReceiving("a request to get product")
              .path("/api/products/123")
              .method("GET")
          .willRespondWith()
              .status(200)
              .body(new PactDslJsonBody()
                  .stringType("id", "123")
                  .stringType("name", "Test Product")
                  .numberType("price", 99.99))
          .toPact();
  }

  @PactTestFor(pactMethod = "getProductPact")
  public class OrderServicePactTest {

      @Autowired
      private ProductServiceClient productClient;

      @Test
      @PactVerification
      public void shouldGetProductFromProvider() {
          // Test that consumer works with provider contract
          ProductDTO product = productClient.getProduct("123");

          assertThat(product.getId()).isEqualTo("123");
          assertThat(product.getName()).isEqualTo("Test Product");
      }
  }
  ```

### Performance Optimization and Caching
- **Caching strategies:**
  - Application-level caching with Caffeine
  - Distributed caching with Redis
  - HTTP caching with Cache-Control headers
  - Database query result caching

- **Performance optimization:**
  - Database query optimization
  - Connection pooling
  - Asynchronous processing
  - Lazy loading vs eager loading

  ```java
  // Caching Configuration
  @Configuration
  @EnableCaching
  public class CacheConfig {

      @Bean
      public CacheManager cacheManager() {
          CaffeineCacheManager cacheManager = new CaffeineCacheManager();
          cacheManager.setCaffeine(Caffeine.newBuilder()
              .initialCapacity(100)
              .maximumSize(1000)
              .expireAfterWrite(Duration.ofMinutes(10))
              .weakKeys()
              .recordStats());

          return cacheManager;
      }

      @Bean
      public RedisCacheManager redisCacheManager(RedisConnectionFactory connectionFactory) {
          return RedisCacheManager.builder(connectionFactory)
              .cacheDefaults(RedisCacheConfiguration.defaultCacheConfig()
                  .entryTtl(Duration.ofHours(1)))
              .build();
      }
  }

  // Service with Caching
  @Service
  public class ProductService {

      @Autowired
      private ProductRepository productRepository;

      @Autowired
      private RedisTemplate<String, Object> redisTemplate;

      @Cacheable(value = "products", key = "#id")
      public ProductDTO getProduct(String id) {
          return productRepository.findById(id)
              .map(this::mapToDTO)
              .orElseThrow(() -> new ProductNotFoundException(id));
      }

      @Cacheable(value = "productsByCategory", key = "#category")
      public List<ProductDTO> getProductsByCategory(String category) {
          return productRepository.findByCategoryAndActiveTrue(category)
              .stream()
              .map(this::mapToDTO)
              .collect(Collectors.toList());
      }

      @CacheEvict(value = "products", key = "#product.id")
      @CacheEvict(value = "productsByCategory", allEntries = true)
      public ProductDTO updateProduct(Product product) {
          Product saved = productRepository.save(product);
          return mapToDTO(saved);
      }

      @Cacheable(value = "productStats")
      public ProductStats getProductStats() {
          // Expensive operation - cache result
          return calculateProductStats();
      }

      // Distributed Lock for Cache Invalidation
      public void invalidateProductCache(String productId) {
          RLock lock = redisTemplate.getConnectionFactory()
              .getConnection()
              .getNativeConnection()
              .getLock("product-cache-lock:" + productId);

          try {
              if (lock.tryLock(10, TimeUnit.SECONDS)) {
                  // Invalidate cache
                  redisTemplate.delete("products::" + productId);
                  redisTemplate.delete("productsByCategory");
              }
          } catch (InterruptedException e) {
              Thread.currentThread().interrupt();
          } finally {
              lock.unlock();
          }
      }

      private ProductStats calculateProductStats() {
          // Simulate expensive calculation
          try {
              Thread.sleep(2000); // 2 seconds
          } catch (InterruptedException e) {
              Thread.currentThread().interrupt();
          }

          long totalProducts = productRepository.count();
          BigDecimal averagePrice = productRepository.findAveragePrice();

          return new ProductStats(totalProducts, averagePrice);
      }
  }

  // Async Processing for Performance
  @Service
  public class OrderProcessingService {

      @Autowired
      private OrderRepository orderRepository;

      @Autowired
      private EmailService emailService;

      @Async
      public CompletableFuture<Void> processOrderAsync(Order order) {
          return CompletableFuture.runAsync(() -> {
              // Heavy processing
              validateOrder(order);
              calculateTaxes(order);
              updateInventory(order);

              // Send confirmation email asynchronously
              emailService.sendOrderConfirmation(order.getCustomerEmail(), order);
          });
      }

      @Async
      public ListenableFuture<Order> enrichOrderData(Order order) {
          SettableListenableFuture<Order> future = new SettableListenableFuture<>();

          CompletableFuture.supplyAsync(() -> {
              // Enrich with additional data
              enrichCustomerData(order);
              enrichProductData(order);
              calculateShippingCost(order);

              return order;
          }).whenComplete((result, throwable) -> {
              if (throwable != null) {
                  future.setException(throwable);
              } else {
                  future.set(result);
              }
          });

          return future;
      }
  }

  // Database Optimization
  @Repository
  public interface ProductRepository extends JpaRepository<Product, String> {

      @Query("SELECT p FROM Product p WHERE p.category = :category AND p.active = true")
      @QueryHints(@QueryHint(name = "org.hibernate.fetchSize", value = "50"))
      List<Product> findByCategoryAndActiveTrue(@Param("category") String category);

      @Query("SELECT AVG(p.price) FROM Product p WHERE p.active = true")
      BigDecimal findAveragePrice();

      @Query("SELECT p FROM Product p LEFT JOIN FETCH p.reviews WHERE p.id = :id")
      Optional<Product> findByIdWithReviews(@Param("id") String id);

      // N+1 Query Prevention
      @EntityGraph(attributePaths = {"category", "reviews"})
      @Query("SELECT p FROM Product p WHERE p.price BETWEEN :minPrice AND :maxPrice")
      List<Product> findProductsInPriceRange(@Param("minPrice") BigDecimal minPrice,
                                           @Param("maxPrice") BigDecimal maxPrice);
  }

  // Connection Pool Configuration
  @Configuration
  public class DatabaseConfig {

      @Bean
      @ConfigurationProperties("spring.datasource.hikari")
      public HikariDataSource dataSource() {
          HikariDataSource dataSource = new HikariDataSource();
          dataSource.setMaximumPoolSize(20);
          dataSource.setMinimumIdle(5);
          dataSource.setIdleTimeout(300000); // 5 minutes
          dataSource.setMaxLifetime(600000); // 10 minutes
          dataSource.setConnectionTimeout(20000); // 20 seconds
          dataSource.setLeakDetectionThreshold(60000); // 1 minute

          return dataSource;
      }
  }
  ```

## Project: Advanced Shopping Cart Service with Event-Driven Architecture
**Objective:** Implement a sophisticated shopping cart service using event sourcing, CQRS, and saga patterns for a production-ready e-commerce platform.

**Requirements:**
1. Implement event sourcing for shopping cart state management
2. Use CQRS pattern for read/write separation
3. Implement saga pattern for cart checkout process
4. Add comprehensive testing (unit, integration, contract)
5. Implement caching and performance optimizations
6. Deploy to cloud platform with monitoring

**Implementation Steps:**

**1. Event Sourcing for Cart State:**
```java
// Cart Aggregate with Event Sourcing
@Aggregate
public class ShoppingCartAggregate {
    // Event-sourced cart implementation
    // ItemAddedEvent, ItemRemovedEvent, CartClearedEvent
    // QuantityUpdatedEvent, CartCheckedOutEvent
}
```

**2. CQRS Implementation:**
```java
// Separate command and query services
// CartCommandService for write operations
// CartQueryService for read operations
// Event handlers to update read models
```

**3. Saga for Checkout Process:**
```java
// CheckoutSaga coordinating inventory, payment, shipping
// Compensating actions for failed checkouts
// Eventual consistency handling
```

**4. Testing Strategy:**
```java
// Unit tests for aggregates and services
// Integration tests with TestContainers
// Contract tests with Pact
// Performance tests with JMeter
```

**5. Performance Optimizations:**
```java
// Redis caching for cart data
// Async processing for heavy operations
// Database query optimization
// Connection pooling configuration
```

**6. Cloud Deployment:**
```yaml
# Kubernetes manifests for cart service
# ConfigMaps and Secrets
# HPA for scaling
# Service mesh integration
```

**Deliverables:**
- Event-sourced shopping cart with CQRS
- Saga-based checkout process
- Comprehensive test suite
- Performance-optimized implementation
- Cloud-native deployment configuration
- Monitoring and observability setup
- API documentation and versioning

## Learning Outcomes
By the end of this module, students will be able to:
- Implement distributed transactions using saga patterns
- Apply event sourcing and CQRS for complex domains
- Design API versioning strategies for evolving systems
- Deploy microservices to cloud platforms (AWS/GCP/Azure)
- Implement comprehensive testing strategies
- Optimize application performance with caching and async processing
- Apply advanced patterns for production-ready microservices
- Design event-driven architectures for scalable systems

## Resources
- "Designing Data-Intensive Applications" by Martin Kleppmann
- "Domain-Driven Design" by Eric Evans
- "Building Microservices" by Sam Newman
- "Event Sourcing and CQRS" by Microsoft Patterns & Practices
- Axon Framework Documentation: https://docs.axoniq.io/
- Pact Contract Testing: https://pact.io/
- Spring Cloud Contract: https://spring.io/projects/spring-cloud-contract