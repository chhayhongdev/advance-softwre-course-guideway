# Final Project: Smart City Analytics & Data Engineering Platform

## Project Overview

**Duration**: 8-12 weeks (team of 4-6 developers)  
**Technology Stack**: Spring Boot Microservices, Kafka, Elasticsearch, PostgreSQL, Redis, Kubernetes  
**Domain**: Smart City Analytics with Real-time Data Processing and Business Intelligence

---

## 🎯 Problem Statement

### Real-World Business Challenge
Modern cities generate massive amounts of data from IoT sensors, citizen apps, transportation systems, and municipal services. City administrators struggle with:

1. **Data Silos**: Transportation, environmental, and civic data stored in separate systems
2. **Real-time Insights**: Lack of immediate visibility into city operations and emergencies
3. **Predictive Analytics**: Inability to forecast traffic patterns, energy consumption, or public safety issues
4. **Citizen Engagement**: No unified platform for citizens to access city services and provide feedback
5. **Resource Optimization**: Inefficient allocation of city resources (police, emergency services, public transport)
6. **Sustainability Tracking**: Difficulty monitoring environmental impact and carbon footprint

### Business Impact
- **Cost Savings**: Optimize resource allocation (estimated 15-25% reduction in operational costs)
- **Emergency Response**: Reduce response times by 40% through predictive analytics
- **Citizen Satisfaction**: Improve service delivery and transparency
- **Environmental Impact**: Better monitoring of air quality, waste management, and energy usage
- **Revenue Generation**: Data-driven decisions for tourism, parking, and utility pricing

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Citizen Mobile/Web Apps                           │
│                    (React Native, Angular, Progressive Web Apps)           │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │         API Gateway (Spring Cloud Gateway) │
                    │    - Authentication & Authorization        │
                    │    - Rate Limiting & Circuit Breakers      │
                    │    - Request Routing & Load Balancing      │
                    └─────────────────┼─────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │         Service Mesh (Istio)      │
                    │    - Traffic Management           │
                    │    - Security Policies            │
                    │    - Observability                │
                    └─────────────────┼─────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
    ┌───────▼──────┐         ┌────────▼────────┐         ┌──────▼──────┐
    │Data Ingestion│         │Analytics Engine │         │ Citizen      │
    │Microservice  │         │Microservice     │         │ Services     │
    │- Kafka Streams│         │- Apache Spark  │         │ Microservice │
    │- Schema Reg.  │         │- ML Models     │         │ - REST APIs   │
    │- Data Quality │         │- Real-time     │         │ - GraphQL     │
    └───────┬──────┘         └────────┬────────┘         └──────┬──────┘
            │                         │                         │
            ▼                         ▼                         ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                      Data Lake (MinIO/S3)                          │
    │                Raw Data Storage & Data Catalog                     │
    └─────────────────────────────────────────────────────────────────────┘
            │                         │                         │
    ┌───────▼─────────────────────────┼─────────────────────────▼──────┐
    │                                                                         │
    │                    Real-time Data Pipeline                             │
    │         ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
    │         │   Apache Kafka  │───▶│  Kafka Streams  │───▶│ Elasticsearch│ │
    │         │   (Event Bus)   │    │  (Processing)   │    │ (Search)    │ │
    │         └─────────────────┘    └─────────────────┘    └─────────────┘ │
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘
            │                         │                         │
    ┌───────▼──────┐         ┌────────▼────────┐         ┌──────▼──────┐
    │Batch Processing│         │  Data Warehouse │         │Visualization │
    │- Apache Spark  │         │  PostgreSQL     │         │  Dashboard   │
    │- ETL Jobs      │         │  Redshift       │         │  Kibana       │
    │- Data Quality  │         │  ClickHouse     │         │  Grafana      │
    └───────────────┘         └─────────────────┘         └───────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │      Monitoring & Alerting        │
                    │   Prometheus | Grafana | ELK      │
                    └───────────────────────────────────┘
```

### Microservices Breakdown

#### 1. Data Ingestion Service
**Purpose**: Ingest data from various sources (IoT sensors, APIs, databases, files)  
**Technologies**: Spring Boot, Apache Kafka, Schema Registry, Avro  
**Key Features**:
- RESTful APIs for data submission
- Batch file processing (CSV, JSON, XML)
- Database change data capture (CDC)
- IoT device management and authentication
- Data validation and cleansing

#### 2. Analytics Engine Service
**Purpose**: Process data streams and generate insights using machine learning  
**Technologies**: Spring Boot, Apache Spark, Python, TensorFlow/PyTorch  
**Key Features**:
- Real-time stream processing
- Batch analytics jobs
- Machine learning model training and deployment
- Predictive analytics (traffic, energy, safety)
- Anomaly detection algorithms

#### 3. Citizen Services Microservice
**Purpose**: Provide APIs for citizen-facing applications and services  
**Technologies**: Spring Boot, GraphQL, Redis, PostgreSQL  
**Key Features**:
- User authentication and profiles
- Service request management
- Public transportation APIs
- Environmental data access
- Notification services

#### 4. Dashboard & Visualization Service
**Purpose**: Provide analytics dashboards and reporting capabilities  
**Technologies**: Spring Boot, Elasticsearch, Kibana, Grafana  
**Key Features**:
- Real-time dashboards
- Custom report generation
- Data export capabilities
- Role-based access control
- Scheduled report delivery

---

## 📊 Data Engineering Pipeline

### Data Sources & Ingestion

#### IoT Sensor Data
```json
{
  "sensorId": "traffic-cam-001",
  "sensorType": "traffic",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "zone": "downtown"
  },
  "measurements": {
    "vehicleCount": 45,
    "averageSpeed": 25.5,
    "congestionLevel": "medium",
    "timestamp": "2025-01-15T10:30:00Z"
  },
  "metadata": {
    "batteryLevel": 85,
    "signalStrength": "good",
    "calibrationDate": "2025-01-01"
  }
}
```

#### Citizen Service Requests
```json
{
  "requestId": "CSR-2025-001",
  "citizenId": "citizen-12345",
  "serviceType": "street-light-outage",
  "location": {
    "address": "123 Main St, NYC",
    "coordinates": [40.7128, -74.0060]
  },
  "description": "Street light not working at intersection",
  "priority": "medium",
  "attachments": ["photo1.jpg", "photo2.jpg"],
  "timestamp": "2025-01-15T14:20:00Z",
  "status": "open"
}
```

#### Transportation Data
```json
{
  "vehicleId": "bus-456",
  "routeId": "MTA-BX12",
  "location": {
    "latitude": 40.7589,
    "longitude": -73.9851
  },
  "status": {
    "occupancy": 75,
    "onTime": true,
    "delayMinutes": 0
  },
  "telemetry": {
    "speed": 15.5,
    "fuelLevel": 68,
    "engineTemp": 185
  },
  "timestamp": "2025-01-15T16:45:00Z"
}
```

### Data Processing Pipeline

#### Real-time Processing (Kafka Streams)
```java
@Configuration
public class KafkaStreamsConfig {
    
    @Bean
    public KStream<String, SensorData> processSensorData(KStream<String, SensorData> sensorStream) {
        return sensorStream
            .filter((key, value) -> value.getMeasurements().getVehicleCount() > 0)
            .mapValues(this::enrichWithLocationData)
            .groupByKey()
            .windowedBy(TimeWindows.of(Duration.ofMinutes(5)))
            .aggregate(
                TrafficAggregate::new,
                (key, value, aggregate) -> aggregate.addMeasurement(value),
                Materialized.<String, TrafficAggregate, WindowStore<Bytes, byte[]>>as("traffic-aggregates")
                    .withValueSerde(JsonSerde.of(TrafficAggregate.class))
            )
            .toStream()
            .map((windowedKey, aggregate) -> KeyValue.pair(
                windowedKey.key(),
                aggregate.calculateMetrics()
            ));
    }
    
    @Bean
    public KStream<String, ServiceRequest> processServiceRequests(KStream<String, ServiceRequest> requestStream) {
        return requestStream
            .filter((key, request) -> request.getPriority().equals("high"))
            .mapValues(this::enrichWithCitizenData)
            .through("high-priority-requests")
            .transform(() -> new ServiceRequestTransformer());
    }
}
```

#### Batch Processing (Apache Spark)
```scala
object CityAnalyticsBatchJob {
  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("City Analytics Batch Job")
      .config("spark.sql.adaptive.enabled", "true")
      .config("spark.sql.adaptive.coalescePartitions.enabled", "true")
      .getOrCreate()

    // Read from data lake
    val sensorData = spark.read
      .format("parquet")
      .load("s3a://data-lake/sensor-data/")
      .withColumn("date", to_date(col("timestamp")))

    // Traffic pattern analysis
    val trafficPatterns = sensorData
      .filter(col("sensorType") === "traffic")
      .groupBy(col("location.zone"), col("date"), window(col("timestamp"), "1 hour"))
      .agg(
        avg("measurements.vehicleCount").as("avg_vehicle_count"),
        avg("measurements.averageSpeed").as("avg_speed"),
        count("*").as("measurement_count")
      )

    // Environmental analysis
    val airQualityTrends = sensorData
      .filter(col("sensorType") === "air-quality")
      .groupBy(col("location.zone"), col("date"))
      .agg(
        avg("measurements.pm25").as("avg_pm25"),
        avg("measurements.pm10").as("avg_pm10"),
        max("measurements.pm25").as("max_pm25")
      )

    // Predictive modeling for emergency response
    val emergencyPrediction = sensorData
      .filter(col("sensorType") === "traffic" || col("sensorType") === "crowd")
      .groupBy(col("location.zone"), window(col("timestamp"), "30 minutes"))
      .agg(
        sum("measurements.vehicleCount").as("total_vehicles"),
        sum("measurements.crowdDensity").as("crowd_density")
      )
      .withColumn("emergency_risk_score",
        when(col("total_vehicles") > 1000 && col("crowd_density") > 500, "high")
        .when(col("total_vehicles") > 500 || col("crowd_density") > 200, "medium")
        .otherwise("low")
      )

    // Write results to data warehouse
    trafficPatterns.write
      .mode("overwrite")
      .partitionBy("date", "zone")
      .format("delta")
      .save("s3a://data-warehouse/traffic-patterns/")

    airQualityTrends.write
      .mode("overwrite")
      .partitionBy("date", "zone")
      .format("delta")
      .save("s3a://data-warehouse/air-quality-trends/")

    emergencyPrediction.write
      .mode("overwrite")
      .format("delta")
      .save("s3a://data-warehouse/emergency-predictions/")
  }
}
```

---

## 🎨 Analytics Dashboards

### City Operations Dashboard
**Real-time Metrics:**
- Traffic congestion levels by zone
- Public transportation status
- Emergency response times
- Air quality indices
- Energy consumption patterns

**Key Visualizations:**
```json
{
  "dashboard": {
    "title": "City Operations Center",
    "refresh": "30s",
    "panels": [
      {
        "title": "Traffic Congestion Heatmap",
        "type": "map",
        "targets": [
          {
            "expr": "traffic_congestion_level",
            "legendFormat": "{{zone}}"
          }
        ]
      },
      {
        "title": "Emergency Response Times",
        "type": "bargauge",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(emergency_response_duration_bucket[5m]))",
            "legendFormat": "95th percentile response time"
          }
        ]
      },
      {
        "title": "Air Quality Trends",
        "type": "graph",
        "targets": [
          {
            "expr": "avg_over_time(air_quality_pm25[1h])",
            "legendFormat": "PM2.5 average"
          }
        ]
      }
    ]
  }
}
```

### Citizen Services Dashboard
**Features:**
- Service request status tracking
- Public transportation schedules
- Environmental alerts
- Community event notifications
- Personal carbon footprint tracking

### Business Intelligence Dashboard
**Analytics:**
- Predictive maintenance for city infrastructure
- Tourism pattern analysis
- Revenue optimization (parking, utilities)
- Sustainability metrics tracking
- Citizen satisfaction surveys

---

## 🔧 Technical Implementation Details

### Database Schema Design

#### PostgreSQL Data Warehouse
```sql
-- Dimension Tables
CREATE TABLE dim_location (
    location_id SERIAL PRIMARY KEY,
    zone_name VARCHAR(100) NOT NULL,
    coordinates GEOMETRY(POINT, 4326),
    population_density INTEGER,
    infrastructure_type VARCHAR(50)
);

CREATE TABLE dim_time (
    time_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    hour INTEGER,
    day INTEGER,
    month INTEGER,
    year INTEGER,
    weekday VARCHAR(10)
);

CREATE TABLE dim_sensor (
    sensor_id VARCHAR(50) PRIMARY KEY,
    sensor_type VARCHAR(50) NOT NULL,
    location_id INTEGER REFERENCES dim_location(location_id),
    installation_date DATE,
    maintenance_schedule JSONB
);

-- Fact Tables
CREATE TABLE fact_sensor_reading (
    reading_id BIGSERIAL PRIMARY KEY,
    sensor_id VARCHAR(50) REFERENCES dim_sensor(sensor_id),
    time_id INTEGER REFERENCES dim_time(time_id),
    location_id INTEGER REFERENCES dim_location(location_id),
    reading_value DECIMAL(10,2),
    reading_unit VARCHAR(20),
    quality_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fact_service_request (
    request_id BIGSERIAL PRIMARY KEY,
    citizen_id VARCHAR(50),
    service_type VARCHAR(100),
    location_id INTEGER REFERENCES dim_location(location_id),
    time_id INTEGER REFERENCES dim_time(time_id),
    priority VARCHAR(20),
    status VARCHAR(20),
    resolution_time INTERVAL,
    satisfaction_score INTEGER
);
```

#### Elasticsearch Mappings
```json
{
  "mappings": {
    "properties": {
      "sensorId": { "type": "keyword" },
      "sensorType": { "type": "keyword" },
      "location": {
        "type": "geo_point"
      },
      "measurements": {
        "type": "object",
        "properties": {
          "vehicleCount": { "type": "integer" },
          "averageSpeed": { "type": "float" },
          "congestionLevel": { "type": "keyword" }
        }
      },
      "timestamp": { "type": "date" },
      "@timestamp": { "type": "date" }
    }
  }
}
```

### API Design

#### RESTful APIs
```java
@RestController
@RequestMapping("/api/v1/city-analytics")
public class CityAnalyticsController {
    
    @Autowired
    private CityAnalyticsService analyticsService;
    
    @GetMapping("/traffic/{zone}")
    public ResponseEntity<TrafficMetrics> getTrafficMetrics(
            @PathVariable String zone,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) 
            LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) 
            LocalDateTime endTime) {
        
        TrafficMetrics metrics = analyticsService.getTrafficMetrics(zone, startTime, endTime);
        return ResponseEntity.ok(metrics);
    }
    
    @GetMapping("/air-quality")
    public ResponseEntity<Page<AirQualityReading>> getAirQualityReadings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String zone) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<AirQualityReading> readings = analyticsService.getAirQualityReadings(zone, pageable);
        return ResponseEntity.ok(readings);
    }
    
    @PostMapping("/alerts")
    public ResponseEntity<AlertResponse> createAlert(@Valid @RequestBody AlertRequest request) {
        AlertResponse response = analyticsService.createAlert(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
```

#### GraphQL API
```graphql
type Query {
  cityMetrics(zone: String!, timeframe: Timeframe!): CityMetrics!
  serviceRequests(status: ServiceRequestStatus, limit: Int): [ServiceRequest!]!
  environmentalData(sensorType: SensorType!, zone: String): EnvironmentalData!
  predictiveInsights(predictionType: PredictionType!): PredictiveInsights!
}

type Mutation {
  submitServiceRequest(request: ServiceRequestInput!): ServiceRequest!
  updateServiceRequest(id: ID!, updates: ServiceRequestUpdate!): ServiceRequest!
  createAlert(alert: AlertInput!): Alert!
}

type Subscription {
  trafficUpdates(zone: String!): TrafficUpdate!
  emergencyAlerts(severity: AlertSeverity): EmergencyAlert!
  airQualityWarnings(zone: String!): AirQualityWarning!
}
```

### Security Implementation

#### JWT Authentication & Authorization
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.csrf().disable()
            .authorizeRequests()
            .antMatchers("/api/v1/public/**").permitAll()
            .antMatchers("/api/v1/city-official/**").hasRole("CITY_OFFICIAL")
            .antMatchers("/api/v1/admin/**").hasRole("ADMIN")
            .antMatchers("/api/v1/citizen/**").hasAnyRole("CITIZEN", "CITY_OFFICIAL", "ADMIN")
            .anyRequest().authenticated()
            .and()
            .oauth2ResourceServer(oauth2 -> oauth2.jwt());
    }
    
    @Bean
    public JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withJwkSetUri("https://city-auth-provider/.well-known/jwks.json").build();
    }
}
```

#### API Gateway Security
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: citizen-services
          uri: lb://citizen-services
          predicates:
            - Path=/api/v1/citizen/**
          filters:
            - AuthenticateCitizen
            - RateLimitCitizen=10,50
        - id: city-analytics
          uri: lb://analytics-service
          predicates:
            - Path=/api/v1/analytics/**
          filters:
            - AuthenticateCityOfficial
            - RateLimitOfficial=100,500
```

---

## 🚀 Deployment & DevOps

### Kubernetes Deployment

#### Helm Chart Structure
```
city-analytics-platform/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── pdb.yaml
│   └── networkpolicy.yaml
├── charts/
│   ├── kafka/
│   ├── elasticsearch/
│   ├── prometheus/
│   └── grafana/
└── ci/
    ├── pipelines/
    └── scripts/
```

#### Production Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-engine
  namespace: city-analytics
spec:
  replicas: 3
  selector:
    matchLabels:
      app: analytics-engine
  template:
    metadata:
      labels:
        app: analytics-engine
    spec:
      serviceAccountName: analytics-service-account
      containers:
      - name: analytics-engine
        image: city/analytics-engine:{{ .Chart.AppVersion }}
        ports:
        - containerPort: 8080
        envFrom:
        - configMapRef:
            name: analytics-config
        - secretRef:
            name: analytics-secrets
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
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
        - name: model-storage
          mountPath: /app/models
      volumes:
      - name: model-storage
        persistentVolumeClaim:
          claimName: model-storage-pvc
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: analytics-engine-hpa
  namespace: city-analytics
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: analytics-engine
  minReplicas: 3
  maxReplicas: 10
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
```

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
name: City Analytics Platform CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
      kafka:
        image: confluentinc/cp-kafka:7.0.0
      elasticsearch:
        image: elasticsearch:8.5.0
    
    steps:
    - uses: actions/checkout@v3
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Cache Maven packages
      uses: actions/cache@v3
      with:
        path: ~/.m2
        key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
        restore-keys: ${{ runner.os }}-m2
    
    - name: Run tests
      run: mvn test -Dspring.profiles.active=test
    
    - name: Generate test report
      run: mvn surefire-report:report
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      with:
        name: test-results
        path: target/surefire-reports/

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build and push Docker images
      run: |
        # Build all services
        docker build -t ${{ steps.login-ecr.outputs.registry }}/data-ingestion:${{ github.sha }} ./data-ingestion
        docker build -t ${{ steps.login-ecr.outputs.registry }}/analytics-engine:${{ github.sha }} ./analytics-engine
        docker build -t ${{ steps.login-ecr.outputs.registry }}/citizen-services:${{ github.sha }} ./citizen-services
        
        # Push images
        docker push ${{ steps.login-ecr.outputs.registry }}/data-ingestion:${{ github.sha }}
        docker push ${{ steps.login-ecr.outputs.registry }}/analytics-engine:${{ github.sha }}
        docker push ${{ steps.login-ecr.outputs.registry }}/citizen-services:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Update kube config
      run: aws eks update-kubeconfig --name city-analytics-cluster
    
    - name: Deploy to Kubernetes
      run: |
        # Update Helm values with new image tags
        sed -i "s/tag:.*/tag: ${{ github.sha }}/g" helm/values.yaml
        
        # Deploy using Helm
        helm upgrade --install city-analytics ./helm \
          --namespace city-analytics \
          --create-namespace \
          --wait \
          --timeout 10m
    
    - name: Run integration tests
      run: |
        # Run post-deployment tests
        kubectl run integration-tests --image=city/integration-tests:${{ github.sha }} \
          --namespace city-analytics \
          --restart=Never \
          --env="ENVIRONMENT=production"
        
        # Wait for tests to complete
        kubectl wait --for=condition=complete job/integration-tests --timeout=300s
        
        # Check test results
        kubectl logs job/integration-tests --namespace city-analytics
```

---

## 📈 Success Metrics & KPIs

### Technical Metrics
- **Performance**: P95 API response time < 500ms
- **Availability**: 99.9% uptime across all services
- **Scalability**: Auto-scale from 10 to 1000+ concurrent users
- **Data Processing**: Process 100,000+ events per second
- **Data Latency**: Real-time analytics < 5 seconds from event ingestion

### Business Metrics
- **Cost Reduction**: 20% reduction in city operational costs
- **Emergency Response**: 35% improvement in response times
- **Citizen Engagement**: 50% increase in app usage
- **Environmental Impact**: 25% reduction in carbon emissions through optimization
- **Revenue Increase**: 15% increase in data-driven revenue streams

### Quality Metrics
- **Data Accuracy**: 99.5% accuracy in analytics predictions
- **System Reliability**: < 0.1% error rate in data processing
- **Security**: Zero data breaches or security incidents
- **User Satisfaction**: > 4.5/5 rating in citizen surveys

---

## 🎯 Deliverables

### Code & Documentation
1. **Complete Microservices**: All 4 microservices with full functionality
2. **Data Pipeline**: Real-time and batch processing pipelines
3. **Analytics Engine**: ML models and predictive algorithms
4. **Dashboards**: Kibana and Grafana dashboards
5. **API Documentation**: OpenAPI/Swagger specifications
6. **Architecture Documentation**: System design and data flow diagrams

### Infrastructure
1. **Kubernetes Manifests**: Production-ready deployments
2. **Helm Charts**: Package management for easy deployment
3. **CI/CD Pipelines**: Automated testing and deployment
4. **Monitoring Setup**: Prometheus, Grafana, and ELK stack
5. **Security Policies**: RBAC, network policies, and secrets management

### Testing & Quality Assurance
1. **Unit Tests**: > 80% code coverage for all services
2. **Integration Tests**: End-to-end testing with TestContainers
3. **Performance Tests**: Load testing with JMeter/Gatling
4. **Security Testing**: Penetration testing and vulnerability scanning
5. **Data Quality Tests**: Validation of data processing accuracy

### Presentation & Demo
1. **Live Demo**: Working application with sample data
2. **Technical Presentation**: Architecture walkthrough and design decisions
3. **Business Case**: ROI analysis and impact assessment
4. **Future Roadmap**: Scaling and feature enhancement plans

---

## 🏆 Evaluation Criteria

### Technical Excellence (40%)
- **Architecture**: Microservices design patterns and best practices
- **Code Quality**: Clean code, proper error handling, documentation
- **Performance**: Optimization for high-throughput and low latency
- **Security**: Implementation of security best practices
- **Scalability**: Auto-scaling and resource optimization

### Data Engineering (30%)
- **Data Pipeline**: Robust ingestion, processing, and storage
- **Data Quality**: Validation, cleansing, and monitoring
- **Analytics**: Accurate and actionable insights
- **Real-time Processing**: Low-latency data processing
- **Data Governance**: Security, privacy, and compliance

### Business Value (20%)
- **Problem Solving**: Addressing real-world city challenges
- **Innovation**: Creative solutions and predictive capabilities
- **User Experience**: Intuitive dashboards and citizen interfaces
- **Impact Measurement**: Quantifiable business outcomes

### Project Management (10%)
- **Planning**: Clear roadmap and milestone delivery
- **Collaboration**: Team coordination and communication
- **Documentation**: Comprehensive technical and user documentation
- **Presentation**: Effective demonstration of capabilities

---

## 🔗 Resources & References

### Technologies
- **Spring Boot**: https://spring.io/projects/spring-boot
- **Apache Kafka**: https://kafka.apache.org/
- **Elasticsearch**: https://www.elastic.co/elasticsearch/
- **Kubernetes**: https://kubernetes.io/
- **Apache Spark**: https://spark.apache.org/

### Learning Resources
- **Designing Data-Intensive Applications**: Martin Kleppmann
- **Streaming Systems**: Tyler Akidau, Slava Chernyak, Reuven Lax
- **Building Microservices**: Sam Newman
- **Kubernetes Patterns**: Bilgin Ibryam, Roland Huß

### Real-World Examples
- **City of Chicago Data Portal**: https://data.cityofchicago.org/
- **New York City Open Data**: https://opendata.cityofnewyork.us/
- **Barcelona Smart City**: https://www.barcelona.cat/barcelonasmartcity/

This final project provides a comprehensive, real-world application of all microservices concepts learned throughout the course, with a focus on data engineering and analytics in a smart city context.