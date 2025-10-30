# Course Assignments: Mastering Spring Boot Microservices

This document contains hands-on assignments focused on transaction management and high-traffic application scenarios. These assignments build upon the e-commerce microservices application developed throughout the course, emphasizing real-world challenges in distributed systems.

## Assignment 1: Database Transactions and ACID Properties (Module 2)

### Objective
Implement comprehensive transaction management in the e-commerce microservices to ensure data consistency and handle concurrent operations under high load.

### Requirements

**1. Order Processing Transaction**
- Implement atomic order creation with inventory deduction
- Handle concurrent inventory updates using optimistic/pessimistic locking
- Implement transaction rollback on payment failures
- Add transaction timeouts and deadlock prevention

**2. Inventory Management**
- Create inventory reservation system with time-based expiration
- Implement inventory updates with proper isolation levels
- Handle stock-outs and backorders gracefully
- Add inventory audit trail for reconciliation

**3. Payment Processing**
- Implement distributed transactions across payment service
- Handle payment gateway timeouts and retries
- Implement payment status tracking with eventual consistency
- Add compensation logic for failed payments

### Technical Implementation

```java
@Service
@Transactional
public class OrderService {
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private InventoryService inventoryService;
    
    @Autowired
    private PaymentService paymentService;
    
    public Order createOrder(CreateOrderRequest request) {
        // 1. Validate and reserve inventory
        List<InventoryReservation> reservations = 
            inventoryService.reserveItems(request.getItems());
        
        try {
            // 2. Create order entity
            Order order = new Order();
            order.setUserId(request.getUserId());
            order.setItems(request.getItems());
            order.setStatus(OrderStatus.PENDING);
            order.setTotalAmount(calculateTotal(request.getItems()));
            
            Order savedOrder = orderRepository.save(order);
            
            // 3. Process payment
            PaymentResult payment = paymentService.processPayment(
                savedOrder.getId(), 
                savedOrder.getTotalAmount()
            );
            
            if (payment.isSuccessful()) {
                savedOrder.setStatus(OrderStatus.CONFIRMED);
                // Confirm inventory reservations
                inventoryService.confirmReservations(reservations);
            } else {
                throw new PaymentFailedException("Payment processing failed");
            }
            
            return orderRepository.save(savedOrder);
            
        } catch (Exception e) {
            // Rollback inventory reservations
            inventoryService.releaseReservations(reservations);
            throw new OrderCreationException("Order creation failed", e);
        }
    }
}
```

### High-Traffic Considerations
- Implement connection pooling with HikariCP
- Add database indexing for performance
- Configure transaction isolation levels appropriately
- Implement read replicas for query optimization

### Deliverables
1. **Transaction Implementation**: Complete order processing with proper transaction boundaries
2. **Concurrency Handling**: Demonstrate handling of concurrent inventory updates
3. **Error Scenarios**: Implement rollback logic for various failure scenarios
4. **Performance Testing**: Load test with 100+ concurrent users
5. **Documentation**: Transaction flow diagrams and error handling strategies

### Evaluation Criteria
- ✅ Proper transaction boundaries and rollback handling
- ✅ Concurrent access handling without data corruption
- ✅ Performance under load (response time < 500ms for 95th percentile)
- ✅ Proper error handling and compensation logic
- ✅ Database optimization and indexing strategy

## Assignment 2: Distributed Transactions with Saga Pattern (Module 6)

### Objective
Implement distributed transactions using the Saga pattern for complex business processes that span multiple microservices.

### Requirements

**1. Order Fulfillment Saga**
- Implement choreography-based saga for order processing
- Handle inventory, payment, and shipping coordination
- Implement compensating transactions for rollback
- Add saga state management and monitoring

**2. Event-Driven Communication**
- Replace synchronous calls with event publishing
- Implement event sourcing for saga state
- Add event replay capabilities for debugging
- Handle event ordering and idempotency

**3. Failure Recovery**
- Implement saga recovery from failures
- Add timeout handling for long-running operations
- Create reconciliation mechanisms for data consistency
- Monitor saga execution and alert on failures

### Technical Implementation

```java
// Saga Definition
@Saga
public class OrderFulfillmentSaga {
    
    @Autowired
    private transient CommandGateway commandGateway;
    
    private String orderId;
    private OrderStatus status;
    private List<String> completedSteps;
    
    @StartSaga
    @SagaEventHandler(associationProperty = "orderId")
    public void handle(OrderCreatedEvent event) {
        this.orderId = event.getOrderId();
        this.completedSteps = new ArrayList<>();
        
        // Step 1: Reserve inventory
        commandGateway.send(new ReserveInventoryCommand(
            event.getOrderId(), 
            event.getItems()
        ));
    }
    
    @SagaEventHandler(associationProperty = "orderId")
    public void handle(InventoryReservedEvent event) {
        completedSteps.add("INVENTORY_RESERVED");
        
        // Step 2: Process payment
        commandGateway.send(new ProcessPaymentCommand(
            event.getOrderId(),
            event.getTotalAmount()
        ));
    }
    
    @SagaEventHandler(associationProperty = "orderId")
    public void handle(PaymentProcessedEvent event) {
        completedSteps.add("PAYMENT_PROCESSED");
        
        // Step 3: Create shipment
        commandGateway.send(new CreateShipmentCommand(
            event.getOrderId(),
            event.getShippingAddress()
        ));
    }
    
    @SagaEventHandler(associationProperty = "orderId")
    public void handle(ShipmentCreatedEvent event) {
        completedSteps.add("SHIPMENT_CREATED");
        
        // Complete saga
        commandGateway.send(new CompleteOrderCommand(event.getOrderId()));
        SagaLifecycle.end();
    }
    
    // Compensation handlers
    @SagaEventHandler(associationProperty = "orderId")
    public void handle(OrderCancellationRequestedEvent event) {
        // Execute compensations in reverse order
        if (completedSteps.contains("SHIPMENT_CREATED")) {
            commandGateway.send(new CancelShipmentCommand(orderId));
        }
        if (completedSteps.contains("PAYMENT_PROCESSED")) {
            commandGateway.send(new RefundPaymentCommand(orderId));
        }
        if (completedSteps.contains("INVENTORY_RESERVED")) {
            commandGateway.send(new ReleaseInventoryCommand(orderId));
        }
        
        commandGateway.send(new CancelOrderCommand(orderId));
        SagaLifecycle.end();
    }
}
```

### High-Traffic Considerations
- Implement event-driven architecture to reduce coupling
- Add message queuing for high-throughput scenarios
- Implement saga instance scaling
- Monitor event processing performance

### Deliverables
1. **Saga Implementation**: Complete order fulfillment saga with all steps
2. **Compensation Logic**: Proper rollback handling for all failure scenarios
3. **Event Infrastructure**: Event publishing and consumption setup
4. **Monitoring Dashboard**: Saga execution tracking and alerting
5. **Load Testing**: Performance testing with 500+ concurrent sagas

### Evaluation Criteria
- ✅ Proper saga coordination across multiple services
- ✅ Reliable compensation logic for all failure scenarios
- ✅ Event-driven architecture implementation
- ✅ Performance under high load (throughput > 100 sagas/minute)
- ✅ Monitoring and observability of saga executions

## Assignment 3: High-Traffic Performance Optimization (Module 4 + 5)

### Objective
Optimize the e-commerce application to handle high traffic scenarios with proper caching, load balancing, and auto-scaling.

### Requirements

**1. Multi-Level Caching Strategy**
- Implement application-level caching with Caffeine
- Add distributed caching with Redis
- Implement HTTP caching headers
- Create cache invalidation strategies

**2. Database Performance Optimization**
- Implement read/write splitting
- Add database indexing and query optimization
- Configure connection pooling
- Implement database sharding if needed

**3. Load Balancing and Scaling**
- Configure Kubernetes HPA for automatic scaling
- Implement proper load balancing strategies
- Add rate limiting and request throttling
- Configure pod disruption budgets

**4. Circuit Breaker and Resilience**
- Implement circuit breakers for external services
- Add bulkhead patterns for resource isolation
- Configure retry mechanisms with exponential backoff
- Implement graceful degradation

### Technical Implementation

```java
@Configuration
public class CacheConfig {
    
    @Bean
    public CacheManager cacheManager() {
        return Caffeine.newBuilder()
            .initialCapacity(100)
            .maximumSize(10000)
            .expireAfterWrite(Duration.ofMinutes(10))
            .recordStats()
            .build();
    }
    
    @Bean
    public RedisCacheManager redisCacheManager(RedisConnectionFactory connectionFactory) {
        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                    .fromSerializer(new GenericJackson2JsonRedisSerializer())))
            .build();
    }
}

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
    
    @Cacheable(value = "productSearch", key = "#category + '_' + #page + '_' + #size")
    public Page<ProductDTO> searchProducts(String category, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return productRepository.findByCategory(category, pageable)
            .map(this::mapToDTO);
    }
    
    @CacheEvict(value = {"products", "productSearch"}, allEntries = true)
    public ProductDTO updateProduct(Product product) {
        Product saved = productRepository.save(product);
        // Publish cache invalidation event
        redisTemplate.convertAndSend("product-updates", 
            new ProductUpdatedEvent(saved.getId()));
        return mapToDTO(saved);
    }
}

@RestController
@RequestMapping("/api/products")
public class ProductController {
    
    @Autowired
    private ProductService productService;
    
    @GetMapping
    public ResponseEntity<Page<ProductDTO>> getProducts(
            @RequestParam String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Page<ProductDTO> products = productService.searchProducts(category, page, size);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setCacheControl(CacheControl.maxAge(300).cachePublic());
        headers.setETag("\"" + category + "_" + page + "_" + size + "\"");
        
        return ResponseEntity.ok().headers(headers).body(products);
    }
}
```

### Kubernetes Configuration for High Traffic

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-service
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
      containers:
      - name: product-service
        image: ecommerce/product-service:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
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
        env:
        - name: SPRING_REDIS_HOST
          value: "redis-service"
        - name: MANAGEMENT_METRICS_EXPORT_PROMETHEUS_ENABLED
          value: "true"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: product-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: product-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
        target:
          type: Utilization
          averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_server_requests_seconds
      target:
        type: AverageValue
        averageValue: "100"  # 100 requests per second per pod
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ecommerce-ingress
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  ingressClassName: nginx
  rules:
  - host: ecommerce.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
```

### High-Traffic Testing
- Load testing with JMeter or Gatling
- Stress testing with 1000+ concurrent users
- Spike testing for sudden traffic increases
- Endurance testing for sustained high load

### Deliverables
1. **Caching Implementation**: Multi-level caching with proper invalidation
2. **Performance Optimization**: Database tuning and query optimization
3. **Auto-Scaling Setup**: Kubernetes HPA configuration and testing
4. **Load Testing Results**: Performance metrics and bottleneck analysis
5. **Monitoring Dashboard**: Real-time performance monitoring setup

### Evaluation Criteria
- ✅ Response time < 200ms for 95th percentile under load
- ✅ Successful handling of 1000+ concurrent users
- ✅ Proper auto-scaling without service disruption
- ✅ Effective caching strategy (cache hit rate > 80%)
- ✅ Comprehensive monitoring and alerting setup

## Assignment 4: Comprehensive High-Traffic E-commerce Platform (Final Project)

### Objective
Create a production-ready e-commerce platform that can handle high traffic, implement all learned patterns, and demonstrate enterprise-grade microservices architecture.

### Requirements

**1. Complete E-commerce Suite**
- Product catalog service with search and recommendations
- User management with authentication and profiles
- Shopping cart with persistence and synchronization
- Order management with complex business rules
- Payment processing with multiple providers
- Inventory management with real-time updates
- Notification service for emails and SMS

**2. Advanced Features**
- Event sourcing for audit trails
- CQRS for read/write optimization
- Saga patterns for complex transactions
- API versioning and documentation
- Multi-region deployment capability

**3. Performance and Scalability**
- Global CDN integration
- Database sharding and replication
- Message queuing for high throughput
- Caching layers at multiple levels
- Auto-scaling and load balancing

**4. Monitoring and Observability**
- Comprehensive metrics collection
- Distributed tracing across all services
- Log aggregation and analysis
- Alerting and incident response
- Performance dashboards

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │────│  Service Mesh   │────│  Monitoring     │
│  (Spring Cloud  │    │  (Istio/Linkerd)│    │  (Prometheus)   │
│   Gateway)      │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                     │
         ▼                        ▼                     ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Product Service │    │ Order Service   │    │ Cart Service    │
│ - Event Sourcing│    │ - Saga Pattern  │    │ - CQRS          │
│ - Read Replicas │    │ - Compensation  │    │ - Redis Cache   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                     │
         ▼                        ▼                     ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  PostgreSQL     │    │   MongoDB       │    │    Redis        │
│  (Sharded)      │    │   (Replicated)  │    │  (Clustered)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Performance Targets
- **Throughput**: 10,000+ requests per second
- **Latency**: P95 < 100ms for API calls
- **Availability**: 99.9% uptime
- **Scalability**: Auto-scale from 10 to 1000+ instances
- **Data Consistency**: Eventual consistency with conflict resolution

### Deliverables
1. **Complete Application**: All microservices with proper APIs
2. **Infrastructure as Code**: Kubernetes manifests and Helm charts
3. **CI/CD Pipeline**: Automated deployment and testing
4. **Performance Report**: Load testing results and optimization measures
5. **Documentation**: API docs, architecture diagrams, and runbooks
6. **Demo**: Live demonstration of high-traffic handling

### Evaluation Criteria
- ✅ Complete e-commerce functionality with all features
- ✅ Performance meeting or exceeding targets
- ✅ Proper implementation of all learned patterns
- ✅ Production-ready deployment and monitoring
- ✅ Comprehensive testing and documentation
- ✅ Scalability demonstration under extreme load

## General Assignment Guidelines

### Submission Requirements
- **Source Code**: Complete implementation with proper structure
- **Documentation**: README files, API documentation, architecture diagrams
- **Tests**: Unit tests, integration tests, performance tests
- **Configuration**: Environment-specific configs and deployment scripts
- **Demo**: Video or live demonstration of functionality

### Assessment Rubric
- **Functionality (40%)**: All requirements implemented correctly
- **Performance (25%)**: Meets performance targets and scales properly
- **Code Quality (15%)**: Clean, well-documented, following best practices
- **Testing (10%)**: Comprehensive test coverage and proper testing strategies
- **Documentation (10%)**: Clear documentation and deployment guides

### Tools and Technologies
- **Frameworks**: Spring Boot, Spring Cloud, Axon Framework
- **Databases**: PostgreSQL, MongoDB, Redis
- **Infrastructure**: Docker, Kubernetes, Helm
- **Monitoring**: Prometheus, Grafana, ELK Stack
- **Testing**: JUnit, TestContainers, JMeter, Pact
- **CI/CD**: GitHub Actions, Jenkins, or similar

### Time Estimates
- **Assignment 1**: 2-3 weeks (individual)
- **Assignment 2**: 3-4 weeks (individual/small team)
- **Assignment 3**: 2-3 weeks (individual/small team)
- **Assignment 4**: 4-6 weeks (team project)

These assignments provide hands-on experience with real-world challenges in building scalable, resilient microservices applications that can handle high traffic and complex transaction scenarios.