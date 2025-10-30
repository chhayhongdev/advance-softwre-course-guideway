# Module 2: Building Core Microservices with Spring Boot

## Overview
This module dives deep into the essential components of microservices development using Spring Boot. Students will learn to design robust REST APIs, implement data persistence with both relational and NoSQL databases, and establish communication patterns between microservices.

## Topics

### RESTful API Design
- **Best practices for designing REST APIs:**
  - Use nouns for resource names, not verbs
  - Use HTTP methods correctly (GET for retrieval, POST for creation, PUT for updates, DELETE for removal)
  - Keep URLs simple and intuitive
  - Use plural nouns for collections
  - Include versioning in the URL or headers
  - Return appropriate HTTP status codes
  - Provide meaningful error messages

- **URI conventions and resource naming:**
  - Hierarchical resource relationships: `/users/{userId}/orders/{orderId}`
  - Query parameters for filtering: `/products?category=electronics&price<100`
  - Avoid deep nesting (limit to 3 levels)
  - Use lowercase and hyphens for readability
  - Be consistent across all endpoints

- **Resource modeling and representation:**
  - DTOs (Data Transfer Objects) for API contracts
  - Separate read and write models when needed
  - Include links for related resources (HATEOAS)
  - Version your API representations
  - Use consistent JSON structure

- **Handling HTTP methods (GET, POST, PUT, DELETE):**
  - **GET:** Safe, idempotent, cacheable - retrieve resources
  - **POST:** Create new resources, not idempotent
  - **PUT:** Update entire resource, idempotent
  - **DELETE:** Remove resource, idempotent
  - **PATCH:** Partial updates, not idempotent

- **Status codes, headers, and content negotiation:**
  - **2xx Success:** 200 OK, 201 Created, 204 No Content
  - **4xx Client Error:** 400 Bad Request, 401 Unauthorized, 404 Not Found
  - **5xx Server Error:** 500 Internal Server Error, 503 Service Unavailable
  - Content-Type and Accept headers for media type negotiation
  - Custom headers for API versioning and metadata

  ```java
  // Example: RESTful API Controller with proper HTTP handling
  @RestController
  @RequestMapping("/api/v1/products")
  public class ProductController {
      
      @Autowired
      private ProductService productService;
      
      @GetMapping
      public ResponseEntity<List<ProductDTO>> getAllProducts(
              @RequestParam(required = false) String category,
              @RequestParam(required = false) BigDecimal maxPrice) {
          
          List<ProductDTO> products = productService.findProducts(category, maxPrice);
          return ResponseEntity.ok(products);
      }
      
      @GetMapping("/{id}")
      public ResponseEntity<ProductDTO> getProductById(@PathVariable Long id) {
          return productService.findById(id)
              .map(product -> ResponseEntity.ok(product))
              .orElse(ResponseEntity.notFound().build());
      }
      
      @PostMapping
      public ResponseEntity<ProductDTO> createProduct(@Valid @RequestBody CreateProductRequest request) {
          ProductDTO created = productService.createProduct(request);
          URI location = ServletUriComponentsBuilder
              .fromCurrentRequest()
              .path("/{id}")
              .buildAndExpand(created.getId())
              .toUri();
          
          return ResponseEntity.created(location).body(created);
      }
      
      @PutMapping("/{id}")
      public ResponseEntity<ProductDTO> updateProduct(
              @PathVariable Long id, 
              @Valid @RequestBody UpdateProductRequest request) {
          
          return productService.updateProduct(id, request)
              .map(product -> ResponseEntity.ok(product))
              .orElse(ResponseEntity.notFound().build());
      }
      
      @DeleteMapping("/{id}")
      public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
          boolean deleted = productService.deleteProduct(id);
          return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
      }
  }
  ```

### Data Persistence
- **Integrating microservices with databases using Spring Data JPA:**
  - Spring Data JPA simplifies data access layer
  - Repository pattern for data operations
  - Automatic query generation
  - Entity lifecycle management

- **Working with relational databases (e.g., PostgreSQL, MySQL):**
  - JPA annotations for entity mapping
  - Relationships: @OneToOne, @OneToMany, @ManyToMany
  - Transaction management
  - Connection pooling with HikariCP

- **Introduction to NoSQL databases (e.g., MongoDB, Cassandra):**
  - Document databases (MongoDB) for flexible schemas
  - Key-value stores for high performance
  - Column-family databases (Cassandra) for wide rows
  - Graph databases for connected data

- **Entity mapping, repositories, and query methods:**
  - @Entity, @Table, @Column annotations
  - Repository interfaces extending JpaRepository
  - Custom query methods using naming conventions
  - @Query annotations for complex queries

- **Database transactions and connection management:**
  - @Transactional annotation for method-level transactions
  - Transaction propagation and isolation levels
  - Connection pooling configuration
  - Handling optimistic locking

  ```java
  // JPA Entity
  @Entity
  @Table(name = "products")
  public class Product {
      @Id
      @GeneratedValue(strategy = GenerationType.IDENTITY)
      private Long id;
      
      @Column(nullable = false)
      private String name;
      
      @Column(length = 1000)
      private String description;
      
      @Column(precision = 10, scale = 2)
      private BigDecimal price;
      
      @Enumerated(EnumType.STRING)
      private ProductCategory category;
      
      @Column(name = "created_at")
      private LocalDateTime createdAt;
      
      @OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
      private List<ProductReview> reviews = new ArrayList<>();
      
      // Constructors, getters, setters
  }

  // Repository Interface
  public interface ProductRepository extends JpaRepository<Product, Long> {
      List<Product> findByCategory(ProductCategory category);
      List<Product> findByPriceBetween(BigDecimal minPrice, BigDecimal maxPrice);
      List<Product> findByNameContainingIgnoreCase(String name);
      
      @Query("SELECT p FROM Product p WHERE p.price > :price ORDER BY p.price DESC")
      List<Product> findExpensiveProducts(@Param("price") BigDecimal price);
      
      @Query("SELECT p FROM Product p LEFT JOIN FETCH p.reviews WHERE p.id = :id")
      Optional<Product> findByIdWithReviews(@Param("id") Long id);
  }

  // Service Layer with Transactions
  @Service
  public class ProductService {
      
      @Autowired
      private ProductRepository productRepository;
      
      @Transactional(readOnly = true)
      public List<ProductDTO> findProducts(String category, BigDecimal maxPrice) {
          // Implementation
      }
      
      @Transactional
      public ProductDTO createProduct(CreateProductRequest request) {
          Product product = new Product();
          // Map request to entity
          product.setName(request.getName());
          product.setDescription(request.getDescription());
          product.setPrice(request.getPrice());
          product.setCategory(request.getCategory());
          product.setCreatedAt(LocalDateTime.now());
          
          Product saved = productRepository.save(product);
          return mapToDTO(saved);
      }
      
      @Transactional
      public Optional<ProductDTO> updateProduct(Long id, UpdateProductRequest request) {
          return productRepository.findById(id)
              .map(product -> {
                  // Update fields
                  product.setName(request.getName());
                  product.setDescription(request.getDescription());
                  product.setPrice(request.getPrice());
                  product.setCategory(request.getCategory());
                  
                  Product saved = productRepository.save(product);
                  return mapToDTO(saved);
              });
      }
      
      @Transactional
      public boolean deleteProduct(Long id) {
          if (productRepository.existsById(id)) {
              productRepository.deleteById(id);
              return true;
          }
          return false;
      }
  }
  ```

### Inter-service Communication
- **Synchronous communication patterns:**
  - **REST API calls between services:**
    - Using RestTemplate or WebClient
    - Handling timeouts and retries
    - Circuit breaker patterns
    - Service mesh considerations

  - **Using OpenFeign client for declarative REST clients:**
    - Declarative HTTP client
    - Integration with service discovery
    - Automatic retry and load balancing

- **Asynchronous communication patterns:**
  - **Message brokers: Apache Kafka and RabbitMQ:**
    - Kafka: High-throughput, durable messaging
    - RabbitMQ: Flexible routing, multiple protocols
    - Message persistence and delivery guarantees

  - **Event-driven architecture basics:**
    - Event sourcing and CQRS
    - Domain events vs integration events
    - Eventual consistency

  - **Implementing publish-subscribe models:**
    - Publisher services emit events
    - Subscriber services react to events
    - Loose coupling between services

  ```java
  // OpenFeign Client
  @FeignClient(name = "user-service", url = "http://localhost:8081")
  public interface UserServiceClient {
      
      @GetMapping("/api/users/{id}")
      UserDTO getUserById(@PathVariable("id") Long id);
      
      @PostMapping("/api/users")
      UserDTO createUser(@RequestBody CreateUserRequest request);
      
      @PutMapping("/api/users/{id}")
      UserDTO updateUser(@PathVariable("id") Long id, @RequestBody UpdateUserRequest request);
  }

  // Service using Feign Client
  @Service
  public class OrderService {
      
      @Autowired
      private UserServiceClient userServiceClient;
      
      @Autowired
      private OrderRepository orderRepository;
      
      @Transactional
      public OrderDTO createOrder(CreateOrderRequest request) {
          // Verify user exists
          UserDTO user = userServiceClient.getUserById(request.getUserId());
          
          // Create order
          Order order = new Order();
          order.setUserId(user.getId());
          order.setStatus(OrderStatus.PENDING);
          // Set other fields...
          
          Order saved = orderRepository.save(order);
          return mapToDTO(saved);
      }
  }

  // Kafka Producer
  @Service
  public class OrderEventPublisher {
      
      @Autowired
      private KafkaTemplate<String, OrderEvent> kafkaTemplate;
      
      public void publishOrderCreated(Order order) {
          OrderEvent event = new OrderEvent("ORDER_CREATED", order.getId(), order.getUserId());
          kafkaTemplate.send("order-events", event);
      }
      
      public void publishOrderPaid(Order order) {
          OrderEvent event = new OrderEvent("ORDER_PAID", order.getId(), order.getUserId());
          kafkaTemplate.send("order-events", event);
      }
  }

  // Kafka Consumer
  @Service
  public class OrderEventConsumer {
      
      @Autowired
      private InventoryService inventoryService;
      
      @Autowired
      private NotificationService notificationService;
      
      @KafkaListener(topics = "order-events", groupId = "order-service")
      public void handleOrderEvent(OrderEvent event) {
          switch (event.getEventType()) {
              case "ORDER_CREATED":
                  inventoryService.reserveItems(event.getOrderId());
                  break;
              case "ORDER_PAID":
                  notificationService.sendConfirmation(event.getUserId(), event.getOrderId());
                  break;
          }
      }
  }

  // Event Classes
  public class OrderEvent {
      private String eventType;
      private Long orderId;
      private Long userId;
      private LocalDateTime timestamp;
      
      // Constructors, getters, setters
  }
  ```

## Project: E-commerce Microservices Suite
**Objective:** Build a suite of three interdependent microservices for a simple e-commerce application: Product Catalog, Order Management, and Payment Service.

**Architecture:**
- **Product Service:** Manages product catalog with CRUD operations
- **Order Service:** Handles order creation and management, communicates with Product and Payment services
- **Payment Service:** Processes payments and manages payment status

**Requirements:**
1. Each service should have its own database
2. Implement REST APIs for all services
3. Use synchronous communication between Order and other services
4. Implement asynchronous event publishing for order status changes
5. Include proper error handling and validation
6. Add basic authentication/authorization

**Implementation Steps:**

**1. Product Service:**
```java
// Product Entity and Repository
@Entity
public class Product {
    @Id @GeneratedValue
    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer stockQuantity;
    // getters, setters
}

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByStockQuantityGreaterThan(Integer quantity);
}

// Product Controller
@RestController
@RequestMapping("/api/products")
public class ProductController {
    
    @Autowired
    private ProductRepository productRepository;
    
    @GetMapping
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable Long id) {
        return productRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        Product saved = productRepository.save(product);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
    
    // PUT and DELETE methods...
}
```

**2. Order Service:**
```java
// Order Entity
@Entity
public class Order {
    @Id @GeneratedValue
    private Long id;
    private Long userId;
    private OrderStatus status;
    private BigDecimal totalAmount;
    @OneToMany(cascade = CascadeType.ALL)
    private List<OrderItem> items;
    private LocalDateTime createdAt;
    // getters, setters
}

@Entity
public class OrderItem {
    @Id @GeneratedValue
    private Long id;
    private Long productId;
    private String productName;
    private BigDecimal price;
    private Integer quantity;
    // getters, setters
}

// Feign Clients
@FeignClient(name = "product-service")
public interface ProductServiceClient {
    @GetMapping("/api/products/{id}")
    Product getProduct(@PathVariable Long id);
}

@FeignClient(name = "payment-service")
public interface PaymentServiceClient {
    @PostMapping("/api/payments")
    PaymentResponse processPayment(@RequestBody PaymentRequest request);
}

// Order Service
@Service
public class OrderService {
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private ProductServiceClient productClient;
    
    @Autowired
    private PaymentServiceClient paymentClient;
    
    @Autowired
    private OrderEventPublisher eventPublisher;
    
    @Transactional
    public OrderDTO createOrder(CreateOrderRequest request) {
        // Validate products and calculate total
        BigDecimal total = BigDecimal.ZERO;
        List<OrderItem> items = new ArrayList<>();
        
        for (OrderItemRequest itemRequest : request.getItems()) {
            Product product = productClient.getProduct(itemRequest.getProductId());
            if (product.getStockQuantity() < itemRequest.getQuantity()) {
                throw new InsufficientStockException("Insufficient stock for product: " + product.getName());
            }
            
            OrderItem item = new OrderItem();
            item.setProductId(product.getId());
            item.setProductName(product.getName());
            item.setPrice(product.getPrice());
            item.setQuantity(itemRequest.getQuantity());
            items.add(item);
            
            total = total.add(product.getPrice().multiply(BigDecimal.valueOf(itemRequest.getQuantity())));
        }
        
        // Create order
        Order order = new Order();
        order.setUserId(request.getUserId());
        order.setStatus(OrderStatus.PENDING);
        order.setTotalAmount(total);
        order.setItems(items);
        order.setCreatedAt(LocalDateTime.now());
        
        Order saved = orderRepository.save(order);
        
        // Publish event
        eventPublisher.publishOrderCreated(saved);
        
        return mapToDTO(saved);
    }
    
    @Transactional
    public OrderDTO processPayment(Long orderId, PaymentRequest paymentRequest) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException("Order not found"));
        
        // Process payment
        PaymentResponse paymentResponse = paymentClient.processPayment(paymentRequest);
        
        if (paymentResponse.isSuccessful()) {
            order.setStatus(OrderStatus.PAID);
            Order saved = orderRepository.save(order);
            eventPublisher.publishOrderPaid(saved);
            return mapToDTO(saved);
        } else {
            throw new PaymentFailedException("Payment processing failed");
        }
    }
}
```

**3. Payment Service:**
```java
// Payment Entity
@Entity
public class Payment {
    @Id @GeneratedValue
    private Long id;
    private Long orderId;
    private BigDecimal amount;
    private PaymentStatus status;
    private String paymentMethod;
    private LocalDateTime processedAt;
    // getters, setters
}

// Payment Service
@Service
public class PaymentService {
    
    @Autowired
    private PaymentRepository paymentRepository;
    
    @Autowired
    private PaymentEventPublisher eventPublisher;
    
    @Transactional
    public PaymentResponse processPayment(PaymentRequest request) {
        // Simulate payment processing
        Payment payment = new Payment();
        payment.setOrderId(request.getOrderId());
        payment.setAmount(request.getAmount());
        payment.setPaymentMethod(request.getPaymentMethod());
        payment.setProcessedAt(LocalDateTime.now());
        
        // Simple validation
        if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            return new PaymentResponse(false, "Invalid amount");
        }
        
        // Simulate payment success/failure
        boolean success = Math.random() > 0.1; // 90% success rate
        
        if (success) {
            payment.setStatus(PaymentStatus.SUCCESS);
            paymentRepository.save(payment);
            eventPublisher.publishPaymentSuccess(payment);
            return new PaymentResponse(true, "Payment successful");
        } else {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            eventPublisher.publishPaymentFailed(payment);
            return new PaymentResponse(false, "Payment failed");
        }
    }
}
```

**Deliverables:**
- Three separate Spring Boot applications
- Individual databases for each service
- REST APIs with proper documentation
- Inter-service communication implementation
- Event-driven architecture for order processing
- Docker Compose file for local development
- API documentation and testing scripts

## Learning Outcomes
By the end of this module, students will be able to:
- Design and implement RESTful APIs following best practices
- Integrate Spring Boot applications with relational databases using JPA
- Implement inter-service communication using both synchronous and asynchronous patterns
- Use OpenFeign for declarative HTTP clients
- Work with message brokers like Kafka for event-driven architecture
- Build multi-service applications with proper separation of concerns
- Handle distributed system challenges like service discovery and fault tolerance

## Resources
- "RESTful Web APIs" by Leonard Richardson and Mike Amundsen
- "Spring Data JPA Reference Documentation"
- "Building Event-Driven Microservices" by Adam Bellemare
- Spring Cloud OpenFeign Documentation
- Apache Kafka Documentation
- RabbitMQ Tutorials