# Production Application Architecture# Production Application Architecture



## Overview## Overview

Production application architecture encompasses the infrastructure, processes, and tools needed to deploy, manage, and monitor applications at scale. This includes CI/CD pipelines, load balancing, and comprehensive observability.Production application architecture encompasses the infrastructure, processes, and tools needed to deploy, manage, and monitor applications at scale. This includes CI/CD pipelines, load balancing, and comprehensive observability.



## 1. CI/CD (Continuous Integration/Continuous Deployment)## 1. CI/CD (Continuous Integration/Continuous Deployment)



### CI/CD Pipeline Components### CI/CD Pipeline Components



#### **Source Control Management**#### **Source Control Management**

- **Version Control**: Git-based repositories with branching strategies```yaml

- **Pull Requests**: Code review process before merging# GitHub Actions CI/CD Pipeline

- **Branch Protection**: Rules preventing direct pushes to main branchesname: Spring Boot CI/CD Pipeline

- **Automated Triggers**: Pipeline execution on code changes

on:

#### **Build Automation**  push:

- **Dependency Management**: Automated resolution of project dependencies    branches: [ main, develop ]

- **Compilation**: Source code to executable artifacts  pull_request:

- **Testing**: Unit tests, integration tests, and performance tests    branches: [ main ]

- **Artifact Creation**: Packaging applications for deployment

env:

#### **Quality Assurance**  REGISTRY: ghcr.io

- **Code Quality**: Static analysis, code coverage, and style checks  IMAGE_NAME: ${{ github.repository }}

- **Security Scanning**: Vulnerability detection in dependencies and code

- **Performance Testing**: Load testing and performance benchmarksjobs:

- **Compliance Checks**: Regulatory and organizational standards  # Quality Assurance

  quality-check:

#### **Artifact Management**    runs-on: ubuntu-latest

- **Binary Storage**: Centralized repository for build artifacts

- **Versioning**: Semantic versioning and artifact tracking    steps:

- **Retention Policies**: Automatic cleanup of old artifacts    - name: Checkout code

- **Access Control**: Secure access to deployment artifacts      uses: actions/checkout@v4



### Deployment Strategies    - name: Set up JDK 17

      uses: actions/setup-java@v4

#### **Blue-Green Deployment**      with:

- **Parallel Environments**: Two identical production environments        java-version: '17'

- **Traffic Switching**: Instantaneous switch between blue and green        distribution: 'temurin'

- **Rollback Capability**: Immediate reversion to previous version

- **Zero Downtime**: No service interruption during deployment    - name: Cache Maven packages

      uses: actions/cache@v3

#### **Canary Deployment**      with:

- **Gradual Rollout**: Deploy to subset of infrastructure first        path: ~/.m2

- **Traffic Splitting**: Percentage-based traffic distribution        key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}

- **Monitoring**: Performance and error rate monitoring during rollout        restore-keys: ${{ runner.os }}-m2

- **Automated Rollback**: Automatic reversion on threshold violations

    - name: Run tests with coverage

#### **Rolling Deployment**      run: mvn test jacoco:report

- **Incremental Updates**: Update instances gradually

- **Load Balancer Integration**: Remove instances from rotation during update    - name: Upload coverage to Codecov

- **Health Checks**: Ensure instance readiness before adding to pool      uses: codecov/codecov-action@v3

- **Rollback Planning**: Strategy for reverting partial deployments      with:

        file: ./target/site/jacoco/jacoco.xml

## 2. Load Balancing

  # Security Scanning

### Load Balancer Types  security-scan:

    runs-on: ubuntu-latest

#### **Layer 4 Load Balancing**    needs: quality-check

- **Transport Layer**: Routing based on IP addresses and ports

- **Connection-Based**: TCP/UDP connection forwarding    steps:

- **High Performance**: Minimal processing overhead    - name: Checkout code

- **Use Cases**: High-throughput applications, gaming      uses: actions/checkout@v4



#### **Layer 7 Load Balancing**    - name: Run Trivy vulnerability scanner

- **Application Layer**: Routing based on HTTP headers and content      uses: aquasecurity/trivy-action@master

- **Content-Based**: URL-based, cookie-based, or header-based routing      with:

- **Advanced Features**: SSL termination, content caching, compression        scan-type: 'fs'

- **Use Cases**: Web applications, API gateways, microservices        scan-ref: '.'

        format: 'sarif'

### Load Balancing Algorithms        output: 'trivy-results.sarif'



#### **Round Robin**    - name: Upload Trivy scan results

- **Equal Distribution**: Requests distributed equally across servers      uses: github/codeql-action/upload-sarif@v2

- **Simple Implementation**: No server state tracking required      if: always()

- **Fairness**: Each server gets equal opportunity      with:

- **Limitations**: Doesn't consider server load or capacity        sarif_file: 'trivy-results.sarif'

```

#### **Least Connections**

- **Load-Based**: Routes to server with fewest active connections#### **Build Automation**

- **Dynamic Balancing**: Adapts to varying server loads```xml

- **Resource Awareness**: Considers current server utilization<!-- Maven pom.xml with CI/CD plugins -->

- **Better Utilization**: Maximizes server resource usage<project xmlns="http://maven.apache.org/POM/4.0.0">

    <properties>

#### **IP Hash**        <maven.compiler.source>17</maven.compiler.source>

- **Sticky Sessions**: Routes based on client IP hash        <maven.compiler.target>17</maven.compiler.target>

- **Session Affinity**: Ensures client requests go to same server        <spring-boot.version>3.1.0</spring-boot.version>

- **Stateful Applications**: Maintains user session state    </properties>

- **Load Imbalance**: May cause uneven distribution

    <dependencies>

#### **Weighted Algorithms**        <!-- Spring Boot Starter -->

- **Capacity-Based**: Considers server capacity differences        <dependency>

- **Resource Allocation**: Higher capacity servers get more traffic            <groupId>org.springframework.boot</groupId>

- **Flexible Configuration**: Adjustable weights based on requirements            <artifactId>spring-boot-starter-web</artifactId>

- **Cost Optimization**: Match traffic to server capabilities        </dependency>



### Health Checks and Failover        <!-- Testing -->

        <dependency>

#### **Active Health Checks**            <groupId>org.springframework.boot</groupId>

- **Periodic Testing**: Regular health verification of backend servers            <artifactId>spring-boot-starter-test</artifactId>

- **Multiple Protocols**: HTTP, TCP, custom application health endpoints            <scope>test</scope>

- **Timeout Configuration**: Configurable response time limits        </dependency>

- **Failure Thresholds**: Number of failures before marking unhealthy    </dependencies>



#### **Passive Health Checks**    <build>

- **Runtime Monitoring**: Monitor actual request/response patterns        <plugins>

- **Error Rate Tracking**: Detect servers returning errors            <!-- Spring Boot Maven Plugin -->

- **Response Time Analysis**: Identify slow or unresponsive servers            <plugin>

- **Automatic Recovery**: Re-enable servers when they recover                <groupId>org.springframework.boot</groupId>

                <artifactId>spring-boot-maven-plugin</artifactId>

## 3. Logging and Monitoring                <configuration>

                    <layers>

### Logging Architecture                        <enabled>true</enabled>

                    </layers>

#### **Log Levels**                </configuration>

- **DEBUG**: Detailed diagnostic information for development            </plugin>

- **INFO**: General information about application operation

- **WARN**: Potentially harmful situations or recoverable errors            <!-- JaCoCo for Code Coverage -->

- **ERROR**: Error conditions that might affect functionality            <plugin>

- **FATAL**: Severe errors that cause application termination                <groupId>org.jacoco</groupId>

                <artifactId>jacoco-maven-plugin</artifactId>

#### **Structured Logging**                <version>0.8.8</version>

- **Consistent Format**: Standardized log entry structure                <executions>

- **Key-Value Pairs**: Machine-readable log attributes                    <execution>

- **Correlation IDs**: Trace requests across service boundaries                        <goals>

- **Context Information**: User IDs, session data, request metadata                            <goal>prepare-agent</goal>

                        </goals>

#### **Log Aggregation**                    </execution>

- **Centralized Collection**: Single location for all application logs                    <execution>

- **Search and Filtering**: Efficient log querying and analysis                        <id>report</id>

- **Retention Policies**: Configurable log storage duration                        <phase>test</phase>

- **Archival**: Long-term storage for compliance and analysis                        <goals>

                            <goal>report</goal>

### Monitoring Systems                        </goals>

                    </execution>

#### **Metrics Collection**                </executions>

- **System Metrics**: CPU, memory, disk, network utilization            </plugin>

- **Application Metrics**: Request rates, error rates, response times

- **Business Metrics**: User activity, conversion rates, revenue            <!-- Maven Surefire for Testing -->

- **Custom Metrics**: Application-specific performance indicators            <plugin>

                <groupId>org.apache.maven.plugins</groupId>

#### **Time Series Databases**                <artifactId>maven-surefire-plugin</artifactId>

- **Efficient Storage**: Optimized for timestamped data                <configuration>

- **Query Performance**: Fast retrieval of time-based data                    <argLine>

- **Retention Policies**: Automatic data expiration                        @{argLine} --add-opens java.base/java.lang=ALL-UNNAMED

- **Downsampling**: Reduce granularity for older data                    </argLine>

                </configuration>

### Alerting and Notification            </plugin>

        </plugins>

#### **Alert Rules**    </build>

- **Threshold-Based**: Trigger alerts when metrics exceed limits</project>

- **Anomaly Detection**: Identify unusual patterns or deviations```

- **Composite Alerts**: Combine multiple conditions

- **Escalation Policies**: Progressive notification strategies#### **Artifact Management**

```yaml

#### **Alert Channels**# Build and push Docker image

- **Email**: Standard notification methodbuild-and-push:

- **SMS/Pager**: Critical alert delivery  runs-on: ubuntu-latest

- **Chat Integration**: Team collaboration platforms  needs: [quality-check, security-scan]

- **Incident Management**: Automated ticket creation

  steps:

## 4. Application Performance Monitoring (APM)  - name: Checkout code

    uses: actions/checkout@v4

### Distributed Tracing

  - name: Set up Docker Buildx

#### **Trace Context Propagation**    uses: docker/setup-buildx-action@v3

- **Request Correlation**: Link operations across service boundaries

- **Span Hierarchy**: Parent-child relationship between operations  - name: Log in to Container Registry

- **Metadata Attachment**: Additional context for debugging    uses: docker/login-action@v3

- **Sampling Strategies**: Balance observability with performance    with:

      registry: ${{ env.REGISTRY }}

#### **Trace Analysis**      username: ${{ github.actor }}

- **Latency Breakdown**: Identify bottlenecks in request flow      password: ${{ secrets.GITHUB_TOKEN }}

- **Error Tracking**: Trace errors through distributed systems

- **Dependency Mapping**: Visualize service interactions  - name: Extract metadata

- **Performance Optimization**: Target slow operations for improvement    id: meta

    uses: docker/metadata-action@v5

### Application Metrics    with:

      images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}

#### **Response Time Monitoring**      tags: |

- **Percentile Tracking**: p50, p95, p99 response times        type=ref,event=branch

- **Latency Distribution**: Understand response time patterns        type=ref,event=pr

- **SLA Compliance**: Monitor against service level agreements        type=sha,prefix={{branch}}-

- **Trend Analysis**: Identify performance degradation over time        type=raw,value=latest,enable={{is_default_branch}}



#### **Error Rate Monitoring**  - name: Build and push Docker image

- **Error Classification**: 4xx vs 5xx error categorization    uses: docker/build-push-action@v5

- **Error Budget**: Allowable error rates within SLOs    with:

- **Root Cause Analysis**: Correlate errors with system conditions      context: .

- **Recovery Monitoring**: Track error resolution effectiveness      push: true

      tags: ${{ steps.meta.outputs.tags }}

### Resource Monitoring      labels: ${{ steps.meta.outputs.labels }}

      cache-from: type=gha

#### **Infrastructure Metrics**      cache-to: type=gha,mode=max

- **Compute Resources**: CPU utilization, memory usage```

- **Storage Metrics**: Disk I/O, storage capacity

- **Network Metrics**: Bandwidth utilization, connection counts### Deployment Strategies

- **Container Metrics**: Pod health, resource limits

#### **Blue-Green Deployment**

#### **Application Resources**```yaml

- **Connection Pools**: Database and external service connections# Kubernetes Blue-Green Deployment

- **Thread Pools**: Application thread utilizationapiVersion: apps/v1

- **Cache Hit Rates**: Memory and external cache performancekind: Deployment

- **Queue Depths**: Asynchronous processing backlogmetadata:

  name: spring-app-blue

## 5. Configuration Management  labels:

    app: spring-app

### Configuration Patterns    version: blue

spec:

#### **Environment-Specific Configuration**  replicas: 3

- **Development**: Local development settings  selector:

- **Staging**: Pre-production testing environment    matchLabels:

- **Production**: Live system configuration      app: spring-app

- **Multi-Environment**: Consistent configuration across environments      version: blue

  template:

#### **Configuration Sources**    metadata:

- **Static Files**: YAML, JSON, properties files      labels:

- **Environment Variables**: OS-level configuration        app: spring-app

- **Configuration Services**: Centralized configuration management        version: blue

- **Runtime Configuration**: Dynamic configuration updates    spec:

      containers:

### Secret Management      - name: spring-app

        image: spring-app:v2.0.0

#### **Secret Storage**        ports:

- **Encrypted Storage**: Secure storage of sensitive data        - containerPort: 8080

- **Access Control**: Role-based access to secrets        env:

- **Audit Logging**: Track secret access and modifications        - name: SPRING_PROFILES_ACTIVE

- **Rotation Policies**: Automatic secret renewal          value: "prod"

---

#### **Secret Distribution**apiVersion: apps/v1

- **Application Injection**: Runtime secret deliverykind: Deployment

- **Environment Variables**: Secure environment variable settingmetadata:

- **Mounted Volumes**: File-based secret access  name: spring-app-green

- **API-Based Access**: Programmatic secret retrieval  labels:

    app: spring-app

## 6. Backup and Disaster Recovery    version: green

spec:

### Backup Strategies  replicas: 3

  selector:

#### **Data Backup Types**    matchLabels:

- **Full Backups**: Complete system state capture      app: spring-app

- **Incremental Backups**: Changes since last backup      version: green

- **Differential Backups**: Changes since last full backup  template:

- **Continuous Backup**: Real-time data protection    metadata:

      labels:

#### **Backup Storage**        app: spring-app

- **On-Site Storage**: Local backup storage        version: green

- **Off-Site Storage**: Geographic redundancy    spec:

- **Cloud Storage**: Scalable, durable backup storage      containers:

- **Hybrid Solutions**: Combination of storage types      - name: spring-app

        image: spring-app:v2.1.0

### Disaster Recovery Planning        ports:

        - containerPort: 8080

#### **Recovery Time Objective (RTO)**        env:

- **Definition**: Maximum acceptable downtime        - name: SPRING_PROFILES_ACTIVE

- **Business Impact**: Cost of downtime to business          value: "prod"

- **Recovery Strategies**: Backup restoration procedures---

- **Testing**: Regular recovery testing and validationapiVersion: v1

kind: Service

#### **Recovery Point Objective (RPO)**metadata:

- **Definition**: Maximum acceptable data loss  name: spring-app-service

- **Data Criticality**: Importance of data freshnessspec:

- **Backup Frequency**: How often backups are taken  selector:

- **Point-in-Time Recovery**: Ability to restore to specific time    app: spring-app

    version: blue  # Switch to green for cutover

### High Availability Patterns  ports:

  - port: 80

#### **Active-Active Configuration**    targetPort: 8080

- **Multiple Active Systems**: All systems serve traffic simultaneously  type: LoadBalancer

- **Load Distribution**: Traffic split across active systems```

- **Data Synchronization**: Real-time data replication

- **Automatic Failover**: Seamless traffic redirection#### **Canary Deployment**

```yaml

#### **Active-Passive Configuration**# Istio VirtualService for Canary Deployment

- **Primary-Secondary Setup**: One active, others standbyapiVersion: networking.istio.io/v1beta1

- **Failover Process**: Automatic promotion of standby systemskind: VirtualService

- **Data Replication**: Continuous data synchronizationmetadata:

- **Capacity Planning**: Standby systems sized for full load  name: spring-app

spec:

## 7. Security in Production  http:

  - route:

### Infrastructure Security    - destination:

        host: spring-app

#### **Network Security**        subset: v1

- **Network Segmentation**: Isolate sensitive systems      weight: 90

- **Firewall Rules**: Control traffic between network segments    - destination:

- **VPN Access**: Secure remote access to infrastructure        host: spring-app

- **DDoS Protection**: Mitigate distributed denial of service attacks        subset: v2

      weight: 10

#### **Access Control**---

- **Principle of Least Privilege**: Minimum required permissionsapiVersion: networking.istio.io/v1beta1

- **Multi-Factor Authentication**: Enhanced authentication securitykind: DestinationRule

- **Role-Based Access**: Permission assignment based on rolesmetadata:

- **Audit Logging**: Track all access and changes  name: spring-app

spec:

### Application Security  host: spring-app

  subsets:

#### **Secure Configuration**  - name: v1

- **Default Credential Removal**: Eliminate default passwords    labels:

- **Security Headers**: HTTP security header implementation      version: v1

- **Input Validation**: Prevent injection attacks  - name: v2

- **Error Handling**: Avoid information leakage    labels:

      version: v2

#### **Runtime Security**```

- **Intrusion Detection**: Monitor for suspicious activity

- **Vulnerability Scanning**: Regular security assessment## 2. Load Balancers

- **Patch Management**: Timely security update application

- **Compliance Monitoring**: Regulatory requirement adherence### Load Balancing Algorithms



## Summary#### **Round Robin**

```java

Production application architecture requires careful consideration of multiple interconnected systems:public class RoundRobinLoadBalancer {

    private final List<String> servers = Arrays.asList(

1. **CI/CD Pipelines**: Automated build, test, and deployment processes        "server1:8080", "server2:8080", "server3:8080"

2. **Load Balancing**: Traffic distribution and high availability    );

3. **Monitoring & Logging**: Comprehensive observability and alerting    private int currentIndex = 0;

4. **Configuration Management**: Secure, environment-appropriate settings

5. **Backup & Recovery**: Data protection and disaster recovery planning    public synchronized String getNextServer() {

6. **Security**: Infrastructure and application security measures        String server = servers.get(currentIndex);

        currentIndex = (currentIndex + 1) % servers.size();

Key principles for production architecture:        return server;

- **Automation**: Reduce manual processes and human error    }

- **Observability**: Comprehensive monitoring and alerting}

- **Scalability**: Design for growth and changing requirements```

- **Reliability**: High availability and fault tolerance

- **Security**: Defense in depth across all layers#### **Least Connections**

- **Compliance**: Meet regulatory and organizational requirements```java
public class LeastConnectionsLoadBalancer {
    private final Map<String, Integer> serverConnections = new ConcurrentHashMap<>();

    public LeastConnectionsLoadBalancer() {
        serverConnections.put("server1:8080", 0);
        serverConnections.put("server2:8080", 0);
        serverConnections.put("server3:8080", 0);
    }

    public synchronized String getNextServer() {
        return serverConnections.entrySet().stream()
            .min(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("server1:8080");
    }

    public void incrementConnections(String server) {
        serverConnections.compute(server, (k, v) -> v + 1);
    }

    public void decrementConnections(String server) {
        serverConnections.compute(server, (k, v) -> Math.max(0, v - 1));
    }
}
```

#### **IP Hash**
```java
public class IPHashLoadBalancer {
    private final List<String> servers = Arrays.asList(
        "server1:8080", "server2:8080", "server3:8080"
    );

    public String getServer(String clientIP) {
        int hash = clientIP.hashCode();
        int index = Math.abs(hash) % servers.size();
        return servers.get(index);
    }
}
```

### Hardware vs Software Load Balancers

#### **Hardware Load Balancers (F5, Citrix)**
- **Performance**: High throughput, low latency
- **Features**: Advanced traffic management, SSL offloading
- **Cost**: Expensive, dedicated hardware
- **Use Cases**: Enterprise environments, high-traffic sites

#### **Software Load Balancers**
- **NGINX**: High performance, extensive features
- **HAProxy**: Reliable, feature-rich
- **AWS ALB/ELB**: Managed service, auto-scaling
- **Traefik**: Modern, container-aware

```nginx
# NGINX Load Balancer Configuration
upstream spring_backend {
    least_conn;  # Least connections algorithm
    server backend1.example.com:8080 weight=3;
    server backend2.example.com:8080 weight=2;
    server backend3.example.com:8080 weight=1;
    server backend4.example.com:8080 backup;  # Backup server
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://spring_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Health check
        health_check interval=10 fails=3 passes=2;
    }
}
```

### Cloud Load Balancers

#### **AWS Application Load Balancer**
```yaml
# CloudFormation template for ALB
Resources:
  ApplicationLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: spring-app-alb
      Scheme: internet-facing
      Type: application
      SecurityGroups:
        - !Ref ALBSecurityGroup
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2

  ALBListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      DefaultActions:
        - Type: forward
          TargetGroupArn: !Ref TargetGroup
      LoadBalancerArn: !Ref ApplicationLoadBalancer
      Port: 80
      Protocol: HTTP

  TargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: spring-app-targets
      Port: 8080
      Protocol: HTTP
      VpcId: !Ref VPC
      HealthCheckPath: /actuator/health
      HealthCheckIntervalSeconds: 30
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 2
```

## 3. Logging & Monitoring

### Centralized Logging

#### **ELK Stack (Elasticsearch, Logstash, Kibana)**
```yaml
# Docker Compose for ELK Stack
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch
    ports:
      - "5044:5044"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
```

#### **Spring Boot Logging Configuration**
```yaml
# application.yml
logging:
  level:
    com.example: INFO
    org.springframework.web: DEBUG
    org.hibernate: ERROR
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
  file:
    name: logs/spring-app.log
    max-size: 10MB
    max-history: 30

# Logback configuration for JSON logging
logging:
  config: classpath:logback-spring.xml
```

```xml
<!-- logback-spring.xml -->
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>

    <!-- Console appender with JSON format -->
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
            <providers>
                <timestamp/>
                <logLevel/>
                <loggerName/>
                <message/>
                <mdc/>
                <stackTrace/>
            </providers>
        </encoder>
    </appender>

    <!-- File appender -->
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/spring-app.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/spring-app.%d{yyyy-MM-dd}.%i.log</fileNamePattern>
            <maxFileSize>10MB</maxFileSize>
            <maxHistory>30</maxHistory>
            <totalSizeCap>1GB</totalSizeCap>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="CONSOLE"/>
        <appender-ref ref="FILE"/>
    </root>
</configuration>
```

### Application Monitoring

#### **Spring Boot Actuator**
```xml
<!-- Maven dependency -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,env,configprops
  endpoint:
    health:
      show-details: when-authorized
    metrics:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}
      environment: ${spring.profiles.active:default}
```

#### **Health Checks**
```java
@Component
public class CustomHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        try {
            // Check database connectivity
            checkDatabaseConnection();

            // Check external service availability
            checkExternalService();

            return Health.up()
                .withDetail("database", "available")
                .withDetail("externalService", "available")
                .build();

        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .build();
        }
    }

    private void checkDatabaseConnection() {
        // Database health check logic
    }

    private void checkExternalService() {
        // External service health check logic
    }
}
```

### Metrics Collection

#### **Micrometer with Prometheus**
```java
@Service
public class OrderService {

    private final Counter orderCreatedCounter;
    private final Timer orderProcessingTimer;
    private final Gauge orderQueueSize;

    public OrderService(MeterRegistry registry) {
        this.orderCreatedCounter = Counter.builder("orders_created_total")
            .description("Total number of orders created")
            .register(registry);

        this.orderProcessingTimer = Timer.builder("order_processing_duration")
            .description("Time taken to process orders")
            .register(registry);

        this.orderQueueSize = Gauge.builder("order_queue_size", orderQueue, List::size)
            .description("Current size of order processing queue")
            .register(registry);
    }

    public void createOrder(Order order) {
        orderCreatedCounter.increment();

        orderProcessingTimer.record(() -> {
            // Order processing logic
            processOrder(order);
        });
    }
}
```

#### **Distributed Tracing**
```xml
<!-- Spring Cloud Sleuth for distributed tracing -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-sleuth</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-sleuth-zipkin</artifactId>
</dependency>
```

```yaml
# application.yml
spring:
  sleuth:
    sampler:
      probability: 1.0  # Sample all requests in development
  zipkin:
    base-url: http://zipkin-server:9411/
    sender:
      type: web  # Send traces via HTTP
```

### Alerting and Dashboards

#### **Prometheus Alerting Rules**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'spring-boot-app'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/actuator/prometheus'

# alert_rules.yml
groups:
  - name: spring_boot_alerts
    rules:
      - alert: HighResponseTime
        expr: http_server_requests_seconds_sum / http_server_requests_seconds_count > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "Response time is {{ $value }}s for {{ $labels.uri }}"

      - alert: HighErrorRate
        expr: rate(http_server_requests_seconds_count{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"
```

#### **Grafana Dashboard**
```json
{
  "dashboard": {
    "title": "Spring Boot Application Dashboard",
    "panels": [
      {
        "title": "HTTP Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_server_requests_seconds_count[5m])",
            "legendFormat": "{{method}} {{uri}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "http_server_requests_seconds{quantile=\"0.95\"}",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "JVM Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "jvm_memory_used_bytes / jvm_memory_max_bytes",
            "legendFormat": "{{area}}"
          }
        ]
      }
    ]
  }
}
```

## Production Best Practices

### 1. **Infrastructure as Code**
```terraform
# Terraform for infrastructure provisioning
resource "aws_instance" "app_server" {
  ami           = "ami-12345678"
  instance_type = "t3.medium"

  tags = {
    Name        = "spring-app-server"
    Environment = "production"
  }

  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    yum install -y java-17-amazon-corretto-headless
    # Application deployment script
  EOF
}
```

### 2. **Configuration Management**
```yaml
# Spring profiles for different environments
spring:
  profiles:
    active: production

---
spring:
  config:
    activate:
      on-profile: production

  datasource:
    url: jdbc:postgresql://prod-db:5432/appdb
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}

  jpa:
    hibernate:
      ddl-auto: validate

logging:
  level:
    root: INFO
    com.example: WARN

management:
  metrics:
    export:
      prometheus:
        enabled: true
```

### 3. **Security Hardening**
```yaml
# Security configurations
server:
  ssl:
    enabled: true
    key-store: classpath:keystore.p12
    key-store-password: ${SSL_KEYSTORE_PASSWORD}
    key-store-type: PKCS12

spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth-server.com

management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
      base-path: /internal
  endpoint:
    health:
      probes:
        enabled: true
```

### 4. **Performance Optimization**
```yaml
# Production optimization settings
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 25
        order_inserts: true
        order_updates: true

server:
  tomcat:
    threads:
      max: 200
      min-spare: 10
    connection-timeout: 20000

management:
  metrics:
    export:
      prometheus:
        step: 10s
```

## Summary

Production application architecture requires:

1. **Reliable CI/CD**: Automated testing, building, and deployment
2. **Scalable Load Balancing**: Distribute traffic efficiently across instances
3. **Comprehensive Monitoring**: Track performance, errors, and system health
4. **Centralized Logging**: Aggregate logs for analysis and debugging
5. **Security**: Protect applications and data in production
6. **Disaster Recovery**: Plan for failures and data loss

Key principles:
- **Automation**: Everything should be automated where possible
- **Monitoring**: Monitor everything, alert on anomalies
- **Scalability**: Design for horizontal scaling
- **Security**: Security by default, defense in depth
- **Reliability**: Build resilient systems with proper error handling