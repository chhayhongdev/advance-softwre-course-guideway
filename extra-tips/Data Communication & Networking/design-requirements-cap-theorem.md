# Design Requirements: CAP Theorem, Throughput, Latency, SLOs and SLAs

## Overview
System design requirements define the constraints and expectations for distributed systems. Understanding CAP theorem, performance metrics, and service level agreements is crucial for designing reliable, scalable applications.

## 1. CAP Theorem

### The Fundamental Trade-off
The CAP theorem, formulated by Eric Brewer in 2000, states that in a distributed system, you can guarantee at most **two out of three** properties simultaneously:

- **Consistency (C)**: All nodes see the same data at the same time
- **Availability (A)**: Every request receives a response, even during failures
- **Partition Tolerance (P)**: System continues to operate despite network partitions

### Understanding the Properties

#### **Consistency**
- **Definition**: All replicas contain the same data at any given time
- **Strong Consistency**: Immediate consistency across all nodes
- **Eventual Consistency**: Replicas become consistent over time
- **Implications**: Ensures data integrity but may impact performance

#### **Availability**
- **Definition**: System remains operational and responsive
- **High Availability**: System stays up despite component failures
- **Service Level**: Measured as percentage uptime (e.g., 99.9%, 99.99%)
- **Implications**: Ensures reliability but may allow temporary inconsistencies

#### **Partition Tolerance**
- **Definition**: System continues functioning during network failures
- **Network Partitions**: Temporary loss of communication between nodes
- **Fault Tolerance**: Ability to handle network segmentation
- **Implications**: Essential for distributed systems but complicates consistency

### CAP Configurations in Practice

#### **CP Systems (Consistency + Partition Tolerance)**
- **Characteristics**:
  - Sacrifices availability during partitions
  - Uses consensus algorithms (Paxos, Raft)
  - Blocks operations to maintain consistency
- **Examples**: MongoDB, HBase, Redis Cluster, ZooKeeper
- **Use Cases**:
  - Financial transactions
  - Inventory management
  - Configuration management
  - Any system where incorrect data is worse than no data

#### **AP Systems (Availability + Partition Tolerance)**
- **Characteristics**:
  - Sacrifices immediate consistency
  - Uses eventual consistency models
  - Allows temporary data conflicts
  - Resolves conflicts asynchronously
- **Examples**: Cassandra, DynamoDB, CouchDB, Riak
- **Use Cases**:
  - Social media feeds
  - Content delivery networks
  - IoT sensor data
  - User session data

#### **CA Systems (Consistency + Availability)**
- **Characteristics**:
  - Not partition tolerant
  - Single point of failure
  - Traditional ACID guarantees
- **Examples**: Single-node RDBMS, LDAP directories
- **Use Cases**:
  - Legacy monolithic applications
  - Single-server deployments
  - Non-distributed systems

### CAP Theorem Implications

#### **No Perfect System**
- **Theoretical Limitation**: Impossible to achieve all three properties
- **Practical Reality**: Network partitions are inevitable in distributed systems
- **Design Decision**: Choose based on business requirements

#### **The PACELC Theorem Extension**
- **PACELC**: If Partitioned, choose Availability or Consistency; Else choose Latency or Consistency
- **More Nuanced View**: Considers latency trade-offs even without partitions
- **Modern Perspective**: Systems can be AP during partitions, CP otherwise

## 2. Throughput

### Throughput Fundamentals

#### **Definition and Measurement**
- **Throughput**: Rate of successful operations per unit time
- **Units**: Requests/second, transactions/second, messages/second, MB/s
- **Scope**: Can be measured at different system levels (application, database, network)

#### **Throughput vs Latency Relationship**
- **Latency**: Time for single operation to complete
- **Throughput**: Number of operations completed per time unit
- **Inverse Relationship**: Often trade-off between the two
- **Little's Law**: Mean number of jobs = Arrival rate × Mean response time

### Throughput Optimization Strategies

#### **Batching**
- **Concept**: Group multiple operations into single requests
- **Benefits**: Reduces overhead, improves resource utilization
- **Trade-offs**: Increases latency for individual operations
- **Examples**: Database bulk inserts, message batching, network packet aggregation

#### **Parallelization**
- **Concept**: Process multiple operations simultaneously
- **Benefits**: Increases total throughput capacity
- **Challenges**: Coordination overhead, resource contention
- **Scaling**: Horizontal scaling vs vertical scaling

#### **Asynchronous Processing**
- **Concept**: Decouple request acceptance from processing
- **Benefits**: Improves perceived performance and resource utilization
- **Patterns**: Queues, event-driven architecture, reactive systems
- **Considerations**: Ordering guarantees, error handling

### Throughput Bottlenecks

#### **Common Limiting Factors**
- **CPU Bound**: Computation-intensive operations
- **Memory Bound**: Large working sets, cache misses
- **I/O Bound**: Disk or network limitations
- **Lock Contention**: Synchronization overhead

#### **Amdahl's Law**
- **Formula**: Speedup = 1 / ((1 - P) + P/N)
- **Interpretation**: Parallelization benefits limited by serial portions
- **Implication**: Focus optimization on bottlenecks, not just parallel code

## 3. Latency

### Latency Components

#### **Types of Latency**
- **Network Latency**: Time for data to travel across network
- **Disk Latency**: Time to read/write from storage
- **Processing Latency**: Time to execute business logic
- **Queue Latency**: Time spent waiting in queues

#### **Latency Measurement**
- **Percentiles**: p50, p95, p99, p99.9 (percentile latencies)
- **Tail Latency**: Focus on worst-case performance
- **Jitter**: Variation in latency measurements

### Latency Optimization

#### **Caching Strategies**
- **Browser Caching**: Reduce network round trips
- **CDN**: Edge caching for global distribution
- **Application Caching**: In-memory data stores
- **Database Caching**: Query result caching

#### **Data Locality**
- **Geographic Distribution**: Deploy closer to users
- **Data Partitioning**: Keep related data together
- **Replication**: Multiple copies reduce access latency

#### **Processing Optimizations**
- **Algorithm Efficiency**: Better algorithms reduce computation time
- **Concurrent Processing**: Parallel execution within requests
- **Precomputation**: Calculate results in advance

### Latency vs Throughput Trade-offs

#### **Batch Processing**
- **High Throughput**: Process many items together
- **High Latency**: Individual items wait for batch completion
- **Use Cases**: Bulk data processing, analytics

#### **Real-time Processing**
- **Low Latency**: Immediate response required
- **Lower Throughput**: Limited by processing capacity
- **Use Cases**: User interactions, real-time analytics

## 4. Service Level Objectives (SLOs)

### SLO Fundamentals

#### **Definition**
- **SLO**: Specific, measurable targets for service performance
- **Scope**: Covers availability, latency, throughput, error rates
- **Measurement**: Based on actual user experience

#### **SLO Components**
- **Indicator**: What is being measured (e.g., response time)
- **Range**: Acceptable performance range
- **Period**: Time window for measurement
- **Percentile**: Statistical measure (e.g., p95, p99)

### Common SLO Types

#### **Availability SLOs**
- **Uptime Percentage**: 99.9% (8.77 hours downtime/year)
- **Error Budget**: Maximum allowed downtime/errors
- **Measurement**: Successful requests / total requests

#### **Latency SLOs**
- **Response Time Targets**: p95 < 200ms, p99 < 500ms
- **User Experience Focus**: Tail latency matters most
- **Measurement**: Request completion time percentiles

#### **Throughput SLOs**
- **Capacity Targets**: Minimum requests/second under load
- **Scalability Requirements**: Performance under increased load
- **Measurement**: Sustained throughput capacity

### SLO Implementation

#### **Error Budgets**
- **Concept**: Allow controlled amount of failures
- **Calculation**: 100% - SLO target = Error budget
- **Usage**: Guide risk-taking in development
- **Benefits**: Balance innovation with reliability

#### **SLO Monitoring**
- **Real-time Dashboards**: Current performance vs targets
- **Alerting**: Notifications when approaching SLO violations
- **Reporting**: Historical performance analysis

## 5. Service Level Agreements (SLAs)

### SLA vs SLO Relationship

#### **SLA Components**
- **Legal Contract**: Binding agreement between provider and customer
- **Financial Penalties**: Consequences for violations
- **Broader Scope**: Includes support, documentation, security

#### **SLO as SLA Foundation**
- **Technical Targets**: SLOs define measurable service levels
- **SLA References SLOs**: SLAs incorporate SLO measurements
- **Customer Impact**: SLAs focus on customer experience

### SLA Structure

#### **Service Description**
- **Scope**: What services are covered
- **Responsibilities**: Provider vs customer obligations
- **Exclusions**: What is not covered

#### **Performance Commitments**
- **Availability Guarantees**: Uptime percentages with credits
- **Performance Targets**: Response times, throughput minimums
- **Support Levels**: Response times for different severity issues

#### **Remedies and Penalties**
- **Service Credits**: Financial compensation for violations
- **Termination Rights**: Options if SLA repeatedly violated
- **Escalation Procedures**: Steps for dispute resolution

### SLA Management

#### **Negotiation Process**
- **Business Requirements**: Align with customer needs
- **Technical Feasibility**: Ensure commitments are achievable
- **Cost Considerations**: Balance service levels with costs

#### **SLA Monitoring**
- **Automated Measurement**: Continuous performance tracking
- **Regular Reporting**: Monthly/quarterly performance reviews
- **Transparency**: Open communication about performance

## 6. Design Decision Framework

### Balancing Conflicting Requirements

#### **Business vs Technical Trade-offs**
- **Consistency vs Performance**: Strong consistency impacts latency
- **Availability vs Cost**: High availability requires redundancy
- **Throughput vs Latency**: Batch processing vs real-time responses

#### **Risk Assessment**
- **Failure Impact**: Cost of downtime, data loss, user impact
- **Recovery Time**: How quickly system can be restored
- **Data Criticality**: Importance of data accuracy vs availability

### Choosing the Right Architecture

#### **Application Categories**
- **Transactional Systems**: Require strong consistency (CP)
- **Analytical Systems**: Prioritize throughput over latency
- **Interactive Systems**: Need low latency and high availability
- **Batch Systems**: Optimize for throughput and cost

#### **Hybrid Approaches**
- **Multi-Region Deployment**: Different consistency levels per region
- **Tiered Architecture**: Different SLAs for different service tiers
- **Graceful Degradation**: Reduce functionality during overload

## 7. Monitoring and Alerting

### Key Metrics to Track

#### **System Health Metrics**
- **Availability**: Uptime percentage, error rates
- **Performance**: Latency percentiles, throughput rates
- **Resource Utilization**: CPU, memory, disk, network usage

#### **Business Metrics**
- **User Experience**: Page load times, conversion rates
- **Service Usage**: Request volumes, user activity patterns
- **Error Impact**: Failed requests, user-facing errors

### Alerting Strategies

#### **Multi-Level Alerts**
- **Warning**: Approaching SLO limits
- **Critical**: SLO violation in progress
- **Emergency**: System-wide failure

#### **Alert Fatigue Prevention**
- **Threshold Setting**: Avoid false positives
- **Escalation Policies**: Different responses for different severities
- **Automated Responses**: Self-healing actions where possible

## Summary

Design requirements for distributed systems involve complex trade-offs between consistency, availability, performance, and cost. Key principles include:

1. **CAP Theorem**: Choose appropriate consistency/availability balance
2. **Performance Metrics**: Understand throughput vs latency trade-offs
3. **SLOs/SLAs**: Define and monitor service level commitments
4. **Business Alignment**: Match technical decisions to business needs
5. **Continuous Monitoring**: Track performance and adjust as needed

Successful system design requires understanding these concepts and making informed trade-offs based on specific application requirements and constraints.
        FINANCIAL_TRANSACTIONS,    // CP - Strong consistency critical
        SOCIAL_MEDIA_FEED,         // AP - Availability and scale important
        USER_SESSIONS,            // AP - Eventual consistency acceptable
        CONFIGURATION_DATA,       // CP - Must be consistent across nodes
        LOG_AGGREGATION,          // AP - High write throughput needed
        ECOMMERCE_INVENTORY       // CP - Prevent overselling
    }

    public static String recommendDatabase(SystemType type) {
        switch (type) {
            case FINANCIAL_TRANSACTIONS:
            case ECOMMERCE_INVENTORY:
            case CONFIGURATION_DATA:
                return "PostgreSQL with synchronous replication (CP)";

            case SOCIAL_MEDIA_FEED:
            case LOG_AGGREGATION:
                return "Cassandra or DynamoDB (AP)";

            case USER_SESSIONS:
                return "Redis Cluster (CP) or Cassandra (AP)";

            default:
                return "PostgreSQL (CA for single node, CP for multi-node)";
        }
    }
}
```

## 2. Throughput

### Understanding Throughput

**Throughput** is the rate at which a system processes requests, typically measured as:
- Requests per second (RPS)
- Transactions per second (TPS)
- Messages per second
- Data transfer rate (MB/s, GB/s)

### Throughput vs Latency

```java

public class ThroughputLatencyDemo {

    // High throughput, high latency (batch processing)
    public void batchProcess(List<Order> orders) {
        long startTime = System.currentTimeMillis();

        // Process in batches for higher throughput
        for (List<Order> batch : Lists.partition(orders, 100)) {
            processBatch(batch);
        }

        long endTime = System.currentTimeMillis();
        double throughput = orders.size() / ((endTime - startTime) / 1000.0);
        System.out.println("Throughput: " + throughput + " orders/second");
    }

    // Low throughput, low latency (real-time processing)
    public Order processOrder(Order order) {
        // Process immediately for low latency
        validateOrder(order);
        enrichOrder(order);
        saveOrder(order);
        return order;
    }
}
```

### Optimizing for Throughput

#### **Batch Processing**
```java
@Service
public class BatchOrderProcessor {

    @Autowired
    private OrderRepository orderRepository;

    @Transactional
    public void processOrderBatch(List<Order> orders) {
        // Single transaction for entire batch
        List<Order> savedOrders = orderRepository.saveAll(orders);

        // Bulk update related entities
        updateInventory(savedOrders);
        sendNotifications(savedOrders);
    }

    @Async
    public CompletableFuture<Void> processAsyncBatch(List<Order> orders) {
        return CompletableFuture.runAsync(() -> {
            processOrderBatch(orders);
        });
    }
}
```

#### **Connection Pooling**

```yaml
# Database connection pool configuration
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 300000
      max-lifetime: 1200000
      connection-timeout: 20000

# HTTP client connection pooling
http:
  client:
    max-connections: 100
    max-connections-per-route: 20
    connection-timeout: 5000
    socket-timeout: 30000
```

#### **Asynchronous Processing**
```java
@Service
public class AsyncOrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Async
    public CompletableFuture<Order> processOrderAsync(Order order) {
        return CompletableFuture.supplyAsync(() -> {
            // Simulate I/O intensive work
            validateOrder(order);
            enrichOrder(order);
            return orderRepository.save(order);
        });
    }

    public List<Order> processOrdersConcurrently(List<Order> orders) {
        List<CompletableFuture<Order>> futures = orders.stream()
            .map(this::processOrderAsync)
            .collect(Collectors.toList());

        return futures.stream()
            .map(CompletableFuture::join)
            .collect(Collectors.toList());
    }
}
```

### Throughput Testing

#### **Load Testing with JMeter**
```xml
<!-- JMeter Test Plan for Throughput Testing -->
<jmeterTestPlan version="1.2">
    <hashTree>
        <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="Throughput Test">
            <elementProp name="TestPlan.user_defined_variables" elementType="Arguments">
                <collectionProp name="Arguments.arguments"/>
            </elementProp>
            <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
        </TestPlan>

        <hashTree>
            <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="API Load Test">
                <intProp name="ThreadGroup.num_threads">100</intProp>
                <intProp name="ThreadGroup.ramp_time">30</intProp>
                <longProp name="ThreadGroup.duration">300</longProp>
                <intProp name="ThreadGroup.delay">0</intProp>
            </ThreadGroup>

            <hashTree>
                <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="Create Order">
                    <stringProp name="HTTPSampler.domain">api.example.com</stringProp>
                    <stringProp name="HTTPSampler.port">443</stringProp>
                    <stringProp name="HTTPSampler.protocol">https</stringProp>
                    <stringProp name="HTTPSampler.path">/api/orders</stringProp>
                    <stringProp name="HTTPSampler.method">POST</stringProp>
                    <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
                    <stringProp name="HTTPSampler.auto_redirects">false</stringProp>
                </HTTPSamplerProxy>
            </hashTree>
        </hashTree>
    </hashTree>
</jmeterTestPlan>
```

## 3. Latency

### Types of Latency

#### **Network Latency**
- **Propagation Delay**: Time for signal to travel
- **Transmission Delay**: Time to push data onto network
- **Processing Delay**: Time for routers/switches to process packets
- **Queuing Delay**: Time packets wait in queues

#### **Application Latency**
- **Database Query Time**: Time to execute queries
- **Serialization/Deserialization**: Converting objects to/from JSON
- **Business Logic**: Time spent in application code
- **External API Calls**: Time waiting for other services

### Measuring Latency

```java
@Service
public class LatencyMonitor {

    private final MeterRegistry meterRegistry;

    public LatencyMonitor(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Timed(value = "order.processing", percentiles = {0.5, 0.95, 0.99})
    public Order processOrder(Order order) {
        long startTime = System.nanoTime();

        try {
            // Business logic
            validateOrder(order);
            enrichOrder(order);
            Order savedOrder = saveOrder(order);

            // Record latency
            long latencyNs = System.nanoTime() - startTime;
            meterRegistry.timer("order.processing.custom")
                .record(latencyNs, TimeUnit.NANOSECONDS);

            return savedOrder;
        } catch (Exception e) {
            meterRegistry.counter("order.processing.errors").increment();
            throw e;
        }
    }

    public void measureExternalCallLatency() {
        Timer.Sample sample = Timer.start(meterRegistry);

        try {
            // External API call
            callExternalService();
        } finally {
            sample.stop(meterRegistry.timer("external.api.call"));
        }
    }
}
```

### Latency Optimization Techniques

#### **Caching Strategies**
```java
@Service
public class CachedOrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CacheManager cacheManager;

    @Cacheable(value = "orders", key = "#orderId")
    public Order getOrder(String orderId) {
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
    }

    @CacheEvict(value = "orders", key = "#order.id")
    public Order updateOrder(Order order) {
        return orderRepository.save(order);
    }

    @CachePut(value = "orders", key = "#order.id")
    public Order createOrder(Order order) {
        return orderRepository.save(order);
    }
}
```

#### **Database Optimization**
```java
@Repository
public class OptimizedOrderRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // Use prepared statements and connection pooling
    public List<Order> findOrdersByStatus(String status) {
        String sql = "SELECT * FROM orders WHERE status = ? ORDER BY created_date DESC";

        return jdbcTemplate.query(sql, new Object[]{status}, (rs, rowNum) -> {
            Order order = new Order();
            order.setId(rs.getString("id"));
            order.setStatus(rs.getString("status"));
            order.setCreatedDate(rs.getTimestamp("created_date"));
            return order;
        });
    }

    // Batch operations for better throughput
    public int[] batchUpdateStatus(List<String> orderIds, String newStatus) {
        String sql = "UPDATE orders SET status = ? WHERE id = ?";
        List<Object[]> batchArgs = orderIds.stream()
            .map(id -> new Object[]{newStatus, id})
            .collect(Collectors.toList());

        return jdbcTemplate.batchUpdate(sql, batchArgs);
    }
}
```

#### **Async Processing for Non-Critical Paths**
```java
@Service
public class OrderNotificationService {

    @Async
    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        // Non-critical notification logic
        // Doesn't block main order processing
        try {
            sendEmailNotification(event.getOrder());
            sendSmsNotification(event.getOrder());
            updateAnalytics(event.getOrder());
        } catch (Exception e) {
            // Log error but don't fail the main transaction
            logger.error("Failed to send notifications", e);
        }
    }
}
```

## 4. SLOs (Service Level Objectives) and SLAs (Service Level Agreements)

### Understanding SLOs and SLAs

#### **Service Level Agreement (SLA)**
- **Contractual Commitment**: Legal agreement with customers
- **Penalties**: Financial penalties for violations
- **Examples**: 99.9% uptime, <100ms response time

#### **Service Level Objective (SLO)**
- **Internal Target**: What the team aims to achieve
- **Measurement**: How performance is tracked
- **Examples**: 99.95% uptime, <50ms response time

#### **Service Level Indicator (SLI)**
- **Actual Measurement**: What is actually being measured
- **Metrics**: Error rate, latency, throughput
- **Examples**: HTTP 5xx error rate, 95th percentile latency

### Defining SLOs

```yaml
# SLO Configuration Example
service_level_objectives:
  api_availability:
    name: "API Availability"
    description: "Percentage of time the API is available"
    target: 99.9
    window: "30d"
    indicator:
      type: "availability"
      metric: "http_requests_total"
      success_criteria: "status_code < 500"

  api_latency:
    name: "API Latency"
    description: "95th percentile response time"
    target: 100
    unit: "ms"
    window: "1h"
    indicator:
      type: "latency"
      metric: "http_request_duration_seconds"
      quantile: 0.95

  order_processing_success:
    name: "Order Processing Success Rate"
    description: "Percentage of orders processed successfully"
    target: 99.5
    window: "1d"
    indicator:
      type: "success_rate"
      metric: "order_processing_total"
      success_criteria: "result = 'success'"
```

### Implementing SLO Monitoring

```java
@Component
public class SLOMonitor {

    private final MeterRegistry meterRegistry;
    private final Map<String, AtomicLong> sloCounters = new ConcurrentHashMap<>();

    public SLOMonitor(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;

        // Register SLO metrics
        registerSLOMetrics();
    }

    private void registerSLOMetrics() {
        // API Availability SLO
        meterRegistry.gauge("slo_api_availability_target", 99.9);
        sloCounters.put("api_requests_total", meterRegistry.counter("api_requests_total"));
        sloCounters.put("api_errors_total", meterRegistry.counter("api_errors_total"));

        // API Latency SLO
        Timer.builder("api_request_duration")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(meterRegistry);
    }

    public void recordAPIRequest(String endpoint, int statusCode, long durationMs) {
        sloCounters.get("api_requests_total").increment();

        if (statusCode >= 500) {
            sloCounters.get("api_errors_total").increment();
        }

        // Record latency
        meterRegistry.timer("api_request_duration")
            .record(durationMs, TimeUnit.MILLISECONDS);
    }

    public double calculateAvailability() {
        double totalRequests = sloCounters.get("api_requests_total").count();
        double errorRequests = sloCounters.get("api_errors_total").count();

        if (totalRequests == 0) return 100.0;

        return ((totalRequests - errorRequests) / totalRequests) * 100.0;
    }
}
```

### SLA Management

```java
@Service
public class SLAService {

    @Autowired
    private SLOMonitor sloMonitor;

    @Autowired
    private AlertService alertService;

    @Scheduled(fixedRate = 300000) // Check every 5 minutes
    public void checkSLAs() {
        // Check API availability
        double availability = sloMonitor.calculateAvailability();
        double targetAvailability = 99.9;

        if (availability < targetAvailability) {
            alertService.sendAlert(
                "SLA Violation: API Availability",
                String.format("Current availability: %.2f%%, Target: %.2f%%",
                    availability, targetAvailability),
                AlertSeverity.CRITICAL
            );
        }

        // Check latency SLO
        double p95Latency = getP95Latency();
        double targetLatency = 100.0; // ms

        if (p95Latency > targetLatency) {
            alertService.sendAlert(
                "SLO Violation: API Latency",
                String.format("P95 latency: %.2fms, Target: %.2fms",
                    p95Latency, targetLatency),
                AlertSeverity.WARNING
            );
        }
    }

    private double getP95Latency() {
        // Query metrics for 95th percentile latency
        // Implementation depends on metrics backend
        return 0.0;
    }
}
```

### Error Budgets

```java
public class ErrorBudgetCalculator {

    public static class ErrorBudget {
        private final double availabilityTarget; // e.g., 99.9
        private final int timeWindowDays; // e.g., 30

        public ErrorBudget(double availabilityTarget, int timeWindowDays) {
            this.availabilityTarget = availabilityTarget;
            this.timeWindowDays = timeWindowDays;
        }

        public Duration calculateAllowedDowntime() {
            double allowedUnavailability = 100.0 - availabilityTarget;
            double allowedUnavailabilityPercent = allowedUnavailability / 100.0;

            long totalSecondsInWindow = timeWindowDays * 24 * 60 * 60;
            long allowedDowntimeSeconds = (long) (totalSecondsInWindow * allowedUnavailabilityPercent);

            return Duration.ofSeconds(allowedDowntimeSeconds);
        }

        public double calculateRemainingBudget(long actualDowntimeSeconds) {
            Duration allowedDowntime = calculateAllowedDowntime();
            long allowedSeconds = allowedDowntime.getSeconds();

            if (actualDowntimeSeconds >= allowedSeconds) {
                return 0.0; // Budget exhausted
            }

            return ((double) (allowedSeconds - actualDowntimeSeconds) / allowedSeconds) * 100.0;
        }
    }

    public static void main(String[] args) {
        ErrorBudget budget = new ErrorBudget(99.9, 30);
        Duration allowedDowntime = budget.calculateAllowedDowntime();

        System.out.println("Allowed downtime for 99.9% SLA over 30 days: " +
            allowedDowntime.toHours() + " hours " +
            (allowedDowntime.toMinutes() % 60) + " minutes");

        // Example: 2 hours of actual downtime
        double remainingBudget = budget.calculateRemainingBudget(2 * 60 * 60);
        System.out.println("Remaining error budget: " + remainingBudget + "%");
    }
}
```

## Design Trade-offs

### Balancing Requirements

```java
public class SystemDesignTradeoffs {

    public enum Priority {
        CONSISTENCY_FIRST,    // CP systems
        AVAILABILITY_FIRST,   // AP systems
        PERFORMANCE_FIRST,    // Optimize for speed
        COST_FIRST           // Optimize for efficiency
    }

    public static SystemDesign recommendDesign(Priority priority,
                                             int expectedLoad,
                                             double requiredAvailability) {

        switch (priority) {
            case CONSISTENCY_FIRST:
                return SystemDesign.builder()
                    .database("PostgreSQL with synchronous replication")
                    .caching("Redis with strong consistency")
                    .architecture("Microservices with Saga pattern")
                    .build();

            case AVAILABILITY_FIRST:
                return SystemDesign.builder()
                    .database("Cassandra or DynamoDB")
                    .caching("Redis with eventual consistency")
                    .architecture("Microservices with Circuit Breaker")
                    .build();

            case PERFORMANCE_FIRST:
                return SystemDesign.builder()
                    .database("Redis or in-memory database")
                    .caching("Multi-level caching")
                    .architecture("Event-driven with async processing")
                    .build();

            case COST_FIRST:
                return SystemDesign.builder()
                    .database("PostgreSQL single node")
                    .caching("Local caching only")
                    .architecture("Monolithic application")
                    .build();

            default:
                throw new IllegalArgumentException("Unknown priority");
        }
    }
}
```

## Summary

Design requirements guide architectural decisions:

1. **CAP Theorem**: Choose appropriate consistency/availability trade-offs
2. **Throughput**: Optimize for request processing rate
3. **Latency**: Minimize response times for better user experience
4. **SLOs/SLAs**: Define and monitor service level commitments

Key principles:
- **Measure Everything**: Track performance metrics continuously
- **Set Realistic Targets**: Balance user needs with technical constraints
- **Plan for Failure**: Design for resilience and graceful degradation
- **Iterate and Improve**: Use data to continuously optimize systems
- **Communicate Clearly**: Ensure stakeholders understand trade-offs and limitations