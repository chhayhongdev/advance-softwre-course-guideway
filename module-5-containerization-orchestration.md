# Module 5: Containerization and Orchestration

## Overview
This module focuses on containerization and orchestration technologies essential for deploying microservices at scale. Students will learn to package applications with Docker and manage complex distributed systems using Kubernetes, enabling reliable and scalable deployments in production environments.

## Topics

### Module 5-1: Linux Fundamentals and DevOps CI/CD Foundations

- **Linux Fundamentals for Developers:**
  - Understanding the Linux filesystem hierarchy (/etc, /var, /usr, /home)
  - Essential command-line tools (ls, cd, grep, find, ps, top, htop)
  - File permissions and ownership (chmod, chown, umask)
  - Process management (ps, kill, nice, renice)
  - Package management (apt, yum, dnf)
  - System monitoring (df, du, free, uptime)
  - Text processing tools (cat, head, tail, sed, awk)
  - Networking basics (ifconfig/ip, netstat/ss, curl, wget)

- **Shell Scripting Essentials:**
  - Bash scripting fundamentals
  - Variables, loops, and conditionals
  - Functions and error handling
  - Cron jobs and scheduled tasks
  - Environment variables and PATH
  - Script debugging and best practices

- **DevOps CI/CD Fundamentals:**
  - Understanding CI/CD pipelines
  - Version control best practices with Git
  - Automated testing strategies
  - Build automation with Maven/Gradle
  - Artifact management and repositories
  - Infrastructure as Code (IaC) concepts
  - Configuration management basics

  ```bash
  # Essential Linux Commands for Developers
  # File System Navigation
  pwd                    # Print working directory
  ls -la                 # List files with details
  cd /path/to/directory  # Change directory
  mkdir -p dir1/dir2     # Create nested directories
  
  # File Operations
  touch filename.txt     # Create empty file
  cp source dest         # Copy files
  mv oldname newname     # Move/rename files
  rm -rf directory       # Remove files/directories
  
  # Text Processing
  cat file.txt           # Display file contents
  head -n 20 file.txt    # Show first 20 lines
  tail -n 20 file.txt    # Show last 20 lines
  grep "pattern" file.txt # Search for text patterns
  sed 's/old/new/g' file.txt # Find and replace text
  
  # Process Management
  ps aux                 # List all processes
  top                    # Interactive process viewer
  htop                   # Enhanced process viewer
  kill -9 PID            # Kill process by ID
  killall process_name   # Kill processes by name
  
  # System Monitoring
  df -h                  # Disk usage
  du -sh directory       # Directory size
  free -h                # Memory usage
  uptime                 # System uptime
  uname -a               # System information
  
  # Network Tools
  ifconfig               # Network interfaces (deprecated, use ip)
  ip addr show           # Show IP addresses
  netstat -tlnp          # Listening ports
  ss -tlnp               # Socket statistics (modern replacement)
  curl -I http://example.com # HTTP headers
  wget http://example.com/file # Download files
  
  # Package Management (Ubuntu/Debian)
  sudo apt update        # Update package list
  sudo apt install package_name # Install package
  sudo apt remove package_name  # Remove package
  sudo apt search package_name  # Search for packages
  
  # Package Management (CentOS/RHEL)
  sudo yum install package_name # Install package (older)
  sudo dnf install package_name # Install package (newer)
  ```

  ```bash
  # Bash Scripting Examples
  #!/bin/bash
  
  # Variables and Functions
  APP_NAME="my-spring-app"
  APP_VERSION="1.0.0"
  
  function log_message() {
      echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
  }
  
  function check_java() {
      if ! command -v java &> /dev/null; then
          log_message "ERROR: Java is not installed"
          exit 1
      fi
      
      JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2)
      log_message "Java version: $JAVA_VERSION"
  }
  
  function build_application() {
      log_message "Building $APP_NAME version $APP_VERSION"
      
      if [ ! -f "pom.xml" ]; then
          log_message "ERROR: pom.xml not found. Are you in the project root?"
          exit 1
      fi
      
      mvn clean package -DskipTests
      
      if [ $? -eq 0 ]; then
          log_message "Build successful"
      else
          log_message "ERROR: Build failed"
          exit 1
      fi
  }
  
  function create_deployment_package() {
      log_message "Creating deployment package"
      
      DEPLOY_DIR="deploy-$APP_VERSION"
      mkdir -p $DEPLOY_DIR
      
      cp target/*.jar $DEPLOY_DIR/
      cp Dockerfile $DEPLOY_DIR/
      cp docker-compose.yml $DEPLOY_DIR/
      
      tar -czf $DEPLOY_DIR.tar.gz $DEPLOY_DIR
      log_message "Deployment package created: $DEPLOY_DIR.tar.gz"
  }
  
  # Main script execution
  log_message "Starting deployment script for $APP_NAME"
  
  check_java
  build_application
  create_deployment_package
  
  log_message "Deployment script completed successfully"
  ```

  ```yaml
  # GitHub Actions CI/CD Pipeline Example
  name: Spring Boot CI/CD Pipeline

  on:
    push:
      branches: [ main, develop ]
    pull_request:
      branches: [ main ]

  env:
    REGISTRY: ghcr.io
    IMAGE_NAME: ${{ github.repository }}

  jobs:
    # Quality Checks
    quality-check:
      runs-on: ubuntu-latest
      
      steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          
      - name: Cache Maven packages
        uses: actions/cache@v3
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
          restore-keys: ${{ runner.os }}-m2
          
      - name: Run tests with coverage
        run: mvn test jacoco:report
        
      - name: Generate test report
        run: mvn surefire-report:report
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./target/site/jacoco/jacoco.xml

    # Security Scanning
    security-scan:
      runs-on: ubuntu-latest
      needs: quality-check
      
      steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

    # Build and Test
    build:
      runs-on: ubuntu-latest
      needs: [quality-check, security-scan]
      
      steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          
      - name: Cache Maven packages
        uses: actions/cache@v3
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
          
      - name: Build application
        run: mvn clean package -DskipTests
        
      - name: Build Docker image
        run: docker build -t ${{ env.IMAGE_NAME }}:latest .
        
      - name: Test Docker image
        run: |
          docker run -d --name test-container -p 8080:8080 ${{ env.IMAGE_NAME }}:latest
          sleep 30
          curl -f http://localhost:8080/actuator/health || exit 1
          docker stop test-container
          
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: spring-boot-app
          path: target/*.jar

    # Deploy to Staging
    deploy-staging:
      runs-on: ubuntu-latest
      needs: build
      if: github.ref == 'refs/heads/develop'
      environment: staging
      
      steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: spring-boot-app
          
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
          
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
        
      - name: Build and push Docker image to ECR
        run: |
          IMAGE_TAG=${{ github.sha }}
          ECR_REGISTRY=${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY=${{ secrets.ECR_REPOSITORY }}
          
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          
          # Create deployment artifact
          echo "IMAGE_TAG=$IMAGE_TAG" > deployment.env
          
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster ${{ secrets.ECS_CLUSTER }} \
            --service ${{ secrets.ECS_SERVICE }} \
            --force-new-deployment \
            --region ${{ secrets.AWS_REGION }}

    # Deploy to Production
    deploy-production:
      runs-on: ubuntu-latest
      needs: deploy-staging
      if: github.ref == 'refs/heads/main'
      environment: production
      
      steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
          
      - name: Deploy to production ECS
        run: |
          aws ecs update-service \
            --cluster ${{ secrets.ECS_PROD_CLUSTER }} \
            --service ${{ secrets.ECS_PROD_SERVICE }} \
            --force-new-deployment \
            --region ${{ secrets.AWS_REGION }}
            
      - name: Run smoke tests
        run: |
          # Wait for deployment to complete
          aws ecs wait services-stable \
            --cluster ${{ secrets.ECS_PROD_CLUSTER }} \
            --services ${{ secrets.ECS_PROD_SERVICE }}
            
          # Run smoke tests against production
          curl -f ${{ secrets.PROD_HEALTH_CHECK_URL }} || exit 1

    # Rollback (manual trigger)
    rollback:
      runs-on: ubuntu-latest
      if: github.event_name == 'workflow_dispatch'
      
      steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
          
      - name: Rollback ECS service
        run: |
          aws ecs update-service \
            --cluster ${{ secrets.ECS_PROD_CLUSTER }} \
            --service ${{ secrets.ECS_PROD_SERVICE }} \
            --task-definition ${{ github.event.inputs.previous_task_definition }} \
            --region ${{ secrets.AWS_REGION }}
  ```

  ```bash
  # Infrastructure as Code with Terraform
  # main.tf
  terraform {
    required_providers {
      aws = {
        source  = "hashicorp/aws"
        version = "~> 5.0"
      }
    }
  }

  provider "aws" {
    region = var.aws_region
  }

  # VPC Configuration
  resource "aws_vpc" "main" {
    cidr_block           = "10.0.0.0/16"
    enable_dns_hostnames = true
    enable_dns_support   = true

    tags = {
      Name = "spring-boot-vpc"
    }
  }

  # Subnets
  resource "aws_subnet" "public" {
    count             = 2
    vpc_id            = aws_vpc.main.id
    cidr_block        = "10.0.${count.index + 1}.0/24"
    availability_zone = data.aws_availability_zones.available.names[count.index]

    tags = {
      Name = "public-subnet-${count.index + 1}"
    }
  }

  # ECR Repository
  resource "aws_ecr_repository" "app" {
    name                 = "spring-boot-app"
    image_tag_mutability = "MUTABLE"

    image_scanning_configuration {
      scan_on_push = true
    }
  }

  # ECS Cluster
  resource "aws_ecs_cluster" "main" {
    name = "spring-boot-cluster"

    setting {
      name  = "containerInsights"
      value = "enabled"
    }
  }

  # ECS Task Definition
  resource "aws_ecs_task_definition" "app" {
    family                   = "spring-boot-app"
    network_mode             = "awsvpc"
    requires_compatibilities = ["FARGATE"]
    cpu                      = "256"
    memory                   = "512"
    execution_role_arn       = aws_iam_role.ecs_execution_role.arn
    task_role_arn            = aws_iam_role.ecs_task_role.arn

    container_definitions = jsonencode([
      {
        name  = "spring-boot-app"
        image = "${aws_ecr_repository.app.repository_url}:latest"
        portMappings = [
          {
            containerPort = 8080
            hostPort      = 8080
            protocol      = "tcp"
          }
        ]
        environment = [
          {
            name  = "SPRING_PROFILES_ACTIVE"
            value = "prod"
          }
        ]
        logConfiguration = {
          logDriver = "awslogs"
          options = {
            "awslogs-group"         = "/ecs/spring-boot-app"
            "awslogs-region"        = var.aws_region
            "awslogs-stream-prefix" = "ecs"
          }
        }
        healthCheck = {
          command = ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health || exit 1"]
          interval = 30
          timeout  = 5
          retries  = 3
        }
      }
    ])
  }

  # ECS Service
  resource "aws_ecs_service" "app" {
    name            = "spring-boot-service"
    cluster         = aws_ecs_cluster.main.id
    task_definition = aws_ecs_task_definition.app.arn
    desired_count   = 2
    launch_type     = "FARGATE"

    network_configuration {
      security_groups  = [aws_security_group.ecs_tasks.id]
      subnets          = aws_subnet.public[*].id
      assign_public_ip = true
    }

    load_balancer {
      target_group_arn = aws_lb_target_group.app.arn
      container_name   = "spring-boot-app"
      container_port   = 8080
    }

    depends_on = [aws_lb_listener.app]
  }

  # Application Load Balancer
  resource "aws_lb" "app" {
    name               = "spring-boot-alb"
    internal           = false
    load_balancer_type = "application"
    security_groups    = [aws_security_group.lb.id]
    subnets            = aws_subnet.public[*].id
  }

  resource "aws_lb_target_group" "app" {
    name        = "spring-boot-tg"
    port        = 8080
    protocol    = "HTTP"
    vpc_id      = aws_vpc.main.id
    target_type = "ip"

    health_check {
      enabled             = true
      healthy_threshold   = 2
      interval            = 30
      matcher             = "200"
      path                = "/actuator/health"
      port                = "traffic-port"
      protocol            = "HTTP"
      timeout             = 5
      unhealthy_threshold = 2
    }
  }

  resource "aws_lb_listener" "app" {
    load_balancer_arn = aws_lb.app.arn
    port              = "80"
    protocol          = "HTTP"

    default_action {
      type             = "forward"
      target_group_arn = aws_lb_target_group.app.arn
    }
  }

  # CloudWatch Alarms
  resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
    alarm_name          = "spring-boot-cpu-utilization"
    comparison_operator = "GreaterThanThreshold"
    evaluation_periods  = "2"
    metric_name         = "CPUUtilization"
    namespace           = "AWS/ECS"
    period              = "300"
    statistic           = "Average"
    threshold           = "80"
    alarm_description   = "This metric monitors ecs cpu utilization"
    alarm_actions       = [aws_sns_topic.alerts.arn]

    dimensions = {
      ClusterName = aws_ecs_cluster.main.name
      ServiceName = aws_ecs_service.app.name
    }
  }

  # Variables
  variable "aws_region" {
    description = "AWS region"
    type        = string
    default     = "us-east-1"
  }

  # Outputs
  output "load_balancer_dns" {
    description = "DNS name of the load balancer"
    value       = aws_lb.app.dns_name
  }

  output "ecr_repository_url" {
    description = "ECR repository URL"
    value       = aws_ecr_repository.app.repository_url
  }
  ```

### Docker for Microservices
- **Introduction to containerization and Docker:**
  - What is containerization and why it matters
  - Docker vs traditional virtualization
  - Container lifecycle and Docker architecture
  - Docker images, containers, and registries
  - Docker networking and storage concepts

- **Benefits of containerization for microservices:**
  - Consistent environments across development, testing, and production
  - Isolation and resource efficiency
  - Faster startup times and portability
  - Simplified dependency management
  - Microservices deployment independence

- **Creating Docker images for Spring Boot applications:**
  - Understanding layered architecture
  - Base images and image optimization
  - Application packaging strategies
  - Environment-specific configurations
  - Security considerations

- **Dockerfile best practices and multi-stage builds:**
  - Efficient layer caching
  - Multi-stage builds for smaller images
  - Security scanning and vulnerability management
  - Image tagging and versioning strategies
  - Build context optimization

- **Managing containers and container registries:**
  - Container lifecycle management
  - Docker Compose for multi-container applications
  - Private registries (Docker Hub, AWS ECR, Google GCR)
  - Image distribution and deployment strategies
  - Container monitoring and logging

  ```dockerfile
  # Multi-stage Dockerfile for Spring Boot application
  # Build stage
  FROM eclipse-temurin:17-jdk-alpine AS builder
  WORKDIR /app

  # Copy Maven wrapper and pom.xml for dependency caching
  COPY .mvn/ .mvn
  COPY mvnw pom.xml ./
  RUN ./mvnw dependency:go-offline -B

  # Copy source code and build
  COPY src ./src
  RUN ./mvnw clean package -DskipTests

  # Runtime stage
  FROM eclipse-temurin:17-jre-alpine
  RUN addgroup -S spring && adduser -S spring -G spring
  USER spring:spring

  # Install curl for health checks
  RUN apk add --no-cache curl

  WORKDIR /app

  # Copy the built JAR from builder stage
  COPY --from=builder /app/target/*.jar app.jar

  # Expose port
  EXPOSE 8080

  # Health check
  HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

  # Run the application
  ENTRYPOINT ["java", "-jar", "/app/app.jar"]

  # Alternative with JVM optimization
  # ENTRYPOINT ["java", \
  #   "-XX:+UseContainerSupport", \
  #   "-XX:MaxRAMPercentage=75.0", \
  #   "-Djava.security.egd=file:/dev/./urandom", \
  #   "-jar", "/app/app.jar"]
  ```

  ```yaml
  # docker-compose.yml for microservices development
  version: '3.8'

  services:
    # Eureka Service Discovery
    eureka-server:
      build:
        context: ./eureka-server
        dockerfile: Dockerfile
      ports:
        - "8761:8761"
      environment:
        - SPRING_PROFILES_ACTIVE=docker
      networks:
        - microservices-net
      healthcheck:
        test: ["CMD", "curl", "-f", "http://localhost:8761"]
        interval: 30s
        timeout: 10s
        retries: 5

    # Config Server
    config-server:
      build:
        context: ./config-server
        dockerfile: Dockerfile
      ports:
        - "8888:8888"
      environment:
        - SPRING_PROFILES_ACTIVE=docker
      depends_on:
        eureka-server:
          condition: service_healthy
      networks:
        - microservices-net

    # Product Service
    product-service:
      build:
        context: ./product-service
        dockerfile: Dockerfile
      ports:
        - "8081:8081"
      environment:
        - SPRING_PROFILES_ACTIVE=docker
        - EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka-server:8761/eureka/
        - SPRING_CLOUD_CONFIG_URI=http://config-server:8888
      depends_on:
        config-server:
          condition: service_healthy
        eureka-server:
          condition: service_healthy
      networks:
        - microservices-net
      volumes:
        - product-data:/app/data

    # Order Service
    order-service:
      build:
        context: ./order-service
        dockerfile: Dockerfile
      ports:
        - "8082:8082"
      environment:
        - SPRING_PROFILES_ACTIVE=docker
        - EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka-server:8761/eureka/
        - SPRING_CLOUD_CONFIG_URI=http://config-server:8888
      depends_on:
        config-server:
          condition: service_healthy
        eureka-server:
          condition: service_healthy
      networks:
        - microservices-net
      volumes:
        - order-data:/app/data

    # API Gateway
    api-gateway:
      build:
        context: ./api-gateway
        dockerfile: Dockerfile
      ports:
        - "8080:8080"
      environment:
        - SPRING_PROFILES_ACTIVE=docker
        - EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka-server:8761/eureka/
        - SPRING_CLOUD_CONFIG_URI=http://config-server:8888
      depends_on:
        config-server:
          condition: service_healthy
        eureka-server:
          condition: service_healthy
      networks:
        - microservices-net

    # PostgreSQL Database
    postgres:
      image: postgres:15-alpine
      environment:
        - POSTGRES_DB=ecommerce
        - POSTGRES_USER=ecommerce
        - POSTGRES_PASSWORD=ecommerce123
      ports:
        - "5432:5432"
      volumes:
        - postgres-data:/var/lib/postgresql/data
        - ./init-scripts:/docker-entrypoint-initdb.d
      networks:
        - microservices-net
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U ecommerce"]
        interval: 30s
        timeout: 10s
        retries: 5

    # MongoDB for Product Catalog
    mongodb:
      image: mongo:6-jammy
      environment:
        - MONGO_INITDB_ROOT_USERNAME=admin
        - MONGO_INITDB_ROOT_PASSWORD=password
        - MONGO_INITDB_DATABASE=productdb
      ports:
        - "27017:27017"
      volumes:
        - mongodb-data:/data/db
        - ./mongo-init:/docker-entrypoint-initdb.d
      networks:
        - microservices-net
      healthcheck:
        test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
        interval: 30s
        timeout: 10s
        retries: 5

    # Zipkin for Distributed Tracing
    zipkin:
      image: openzipkin/zipkin:2.24
      ports:
        - "9411:9411"
      environment:
        - STORAGE_TYPE=mem
      networks:
        - microservices-net

    # Prometheus for Monitoring
    prometheus:
      image: prom/prometheus:latest
      ports:
        - "9090:9090"
      volumes:
        - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
        - prometheus-data:/prometheus
      command:
        - '--config.file=/etc/prometheus/prometheus.yml'
        - '--storage.tsdb.path=/prometheus'
        - '--web.console.libraries=/etc/prometheus/console_libraries'
        - '--web.console.templates=/etc/prometheus/consoles'
        - '--storage.tsdb.retention.time=200h'
        - '--web.enable-lifecycle'
      networks:
        - microservices-net

    # Grafana for Visualization
    grafana:
      image: grafana/grafana:latest
      ports:
        - "3000:3000"
      environment:
        - GF_SECURITY_ADMIN_PASSWORD=admin
      volumes:
        - grafana-data:/var/lib/grafana
        - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
        - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
      networks:
        - microservices-net

  volumes:
    product-data:
    order-data:
    postgres-data:
    mongodb-data:
    prometheus-data:
    grafana-data:

  networks:
    microservices-net:
      driver: bridge
  ```

  ```dockerfile
  # Dockerfile for different environments
  # Base stage with common configurations
  FROM eclipse-temurin:17-jre-alpine AS base
  RUN addgroup -S spring && adduser -S spring -G spring
  USER spring:spring
  WORKDIR /app

  # Development stage
  FROM base AS development
  COPY target/*.jar app.jar
  EXPOSE 8080
  ENTRYPOINT ["java", "-jar", "/app/app.jar", "--spring.profiles.active=dev"]

  # Staging stage
  FROM base AS staging
  COPY target/*.jar app.jar
  EXPOSE 8080
  ENTRYPOINT ["java", "-jar", "/app/app.jar", "--spring.profiles.active=staging"]

  # Production stage
  FROM base AS production
  COPY target/*.jar app.jar
  EXPOSE 8080
  # Production optimizations
  ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-XX:+UseG1GC", \
    "-XX:+UseCompressedOops", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-Dspring.profiles.active=prod", \
    "-jar", "/app/app.jar"]
  ```

### Kubernetes (K8s) for Orchestration
- **Basics of Kubernetes and container orchestration:**
  - Kubernetes architecture and components
  - Control plane and worker nodes
  - API server, etcd, scheduler, and controllers
  - kubectl command-line tool
  - Kubernetes objects and resources

- **Kubernetes architecture: pods, services, deployments:**
  - Pods: smallest deployable units
  - Services: networking and service discovery
  - Deployments: declarative application updates
  - ReplicaSets and rolling updates
  - ConfigMaps and Secrets

- **Deploying microservices to Kubernetes clusters:**
  - Creating Kubernetes manifests
  - Deployment strategies (Rolling, Blue-Green, Canary)
  - Resource limits and requests
  - Health checks and probes
  - Init containers and sidecar patterns

- **Service discovery and load balancing in K8s:**
  - ClusterIP, NodePort, and LoadBalancer services
  - Ingress controllers and routing
  - Service mesh concepts (Istio, Linkerd)
  - External load balancers
  - DNS-based service discovery

- **Scaling, rolling updates, and self-healing:**
  - Horizontal Pod Autoscaler (HPA)
  - Vertical Pod Autoscaler (VPA)
  - Rolling update strategies
  - Pod disruption budgets
  - Self-healing with liveness and readiness probes

- **Managing configurations and secrets in Kubernetes:**
  - ConfigMaps for non-sensitive configuration
  - Secrets for sensitive data
  - Environment variables and mounted volumes
  - External configuration management
  - Configuration hot-reloading

  ```yaml
  # Complete Kubernetes manifests for microservices

  # Namespace for the application
  apiVersion: v1
  kind: Namespace
  metadata:
    name: ecommerce
    labels:
      name: ecommerce
  ---
  # ConfigMap for application configuration
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: app-config
    namespace: ecommerce
  data:
    SPRING_PROFILES_ACTIVE: "k8s"
    LOGGING_LEVEL_COM_EXAMPLE: "INFO"
    MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE: "health,info,metrics,prometheus"
    MANAGEMENT_ENDPOINT_HEALTH_SHOW_DETAILS: "when-authorized"
  ---
  # Secret for database credentials
  apiVersion: v1
  kind: Secret
  metadata:
    name: db-secret
    namespace: ecommerce
  type: Opaque
  data:
    # Base64 encoded values
    POSTGRES_USER: ZWNvbW1lcmNl  # ecommerce
    POSTGRES_PASSWORD: ZWNvbW1lcmNlMTIz  # ecommerce123
    MONGO_USERNAME: YWRtaW4=  # admin
    MONGO_PASSWORD: cGFzc3dvcmQ=  # password
  ---
  # PostgreSQL Deployment and Service
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: postgres
    namespace: ecommerce
    labels:
      app: postgres
  spec:
    replicas: 1
    selector:
      matchLabels:
        app: postgres
    template:
      metadata:
        labels:
          app: postgres
      spec:
        containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
          - containerPort: 5432
          env:
          - name: POSTGRES_DB
            value: "ecommerce"
          - name: POSTGRES_USER
            valueFrom:
              secretKeyRef:
                name: db-secret
                key: POSTGRES_USER
          - name: POSTGRES_PASSWORD
            valueFrom:
              secretKeyRef:
                name: db-secret
                key: POSTGRES_PASSWORD
          volumeMounts:
          - name: postgres-storage
            mountPath: /var/lib/postgresql/data
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            exec:
              command:
              - pg_isready
              - -U
              - $(POSTGRES_USER)
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
              - pg_isready
              - -U
              - $(POSTGRES_USER)
            initialDelaySeconds: 5
            periodSeconds: 5
        volumes:
        - name: postgres-storage
          persistentVolumeClaim:
            claimName: postgres-pvc
  ---
  apiVersion: v1
  kind: Service
  metadata:
    name: postgres
    namespace: ecommerce
  spec:
    selector:
      app: postgres
    ports:
    - port: 5432
      targetPort: 5432
    clusterIP: None  # Headless service for stateful access
  ---
  # PersistentVolumeClaim for PostgreSQL
  apiVersion: v1
  kind: PersistentVolumeClaim
  metadata:
    name: postgres-pvc
    namespace: ecommerce
  spec:
    accessModes:
      - ReadWriteOnce
    resources:
      requests:
        storage: 10Gi
  ---
  # MongoDB Deployment and Service
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: mongodb
    namespace: ecommerce
    labels:
      app: mongodb
  spec:
    replicas: 1
    selector:
      matchLabels:
        app: mongodb
    template:
      metadata:
        labels:
          app: mongodb
      spec:
        containers:
        - name: mongodb
          image: mongo:6-jammy
          ports:
          - containerPort: 27017
          env:
          - name: MONGO_INITDB_ROOT_USERNAME
            valueFrom:
              secretKeyRef:
                name: db-secret
                key: MONGO_USERNAME
          - name: MONGO_INITDB_ROOT_PASSWORD
            valueFrom:
              secretKeyRef:
                name: db-secret
                key: MONGO_PASSWORD
          - name: MONGO_INITDB_DATABASE
            value: "productdb"
          volumeMounts:
          - name: mongodb-storage
            mountPath: /data/db
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            exec:
              command:
              - mongosh
              - --eval
              - "db.adminCommand('ping')"
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
              - mongosh
              - --eval
              - "db.adminCommand('ping')"
            initialDelaySeconds: 5
            periodSeconds: 5
        volumes:
        - name: mongodb-storage
          persistentVolumeClaim:
            claimName: mongodb-pvc
  ---
  apiVersion: v1
  kind: Service
  metadata:
    name: mongodb
    namespace: ecommerce
  spec:
    selector:
      app: mongodb
    ports:
    - port: 27017
      targetPort: 27017
  ---
  # PersistentVolumeClaim for MongoDB
  apiVersion: v1
  kind: PersistentVolumeClaim
  metadata:
    name: mongodb-pvc
    namespace: ecommerce
  spec:
    accessModes:
      - ReadWriteOnce
    resources:
      requests:
        storage: 10Gi
  ---
  # Eureka Server Deployment and Service
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: eureka-server
    namespace: ecommerce
    labels:
      app: eureka-server
  spec:
    replicas: 1
    selector:
      matchLabels:
        app: eureka-server
    template:
      metadata:
        labels:
          app: eureka-server
      spec:
        containers:
        - name: eureka-server
          image: ecommerce/eureka-server:latest
          ports:
          - containerPort: 8761
          envFrom:
          - configMapRef:
              name: app-config
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /
              port: 8761
            initialDelaySeconds: 60
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /
              port: 8761
            initialDelaySeconds: 30
            periodSeconds: 10
  ---
  apiVersion: v1
  kind: Service
  metadata:
    name: eureka-server
    namespace: ecommerce
  spec:
    selector:
      app: eureka-server
    ports:
    - port: 8761
      targetPort: 8761
  ---
  # Config Server Deployment and Service
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: config-server
    namespace: ecommerce
    labels:
      app: config-server
  spec:
    replicas: 1
    selector:
      matchLabels:
        app: config-server
    template:
      metadata:
        labels:
          app: config-server
      spec:
        containers:
        - name: config-server
          image: ecommerce/config-server:latest
          ports:
          - containerPort: 8888
          envFrom:
          - configMapRef:
              name: app-config
          env:
          - name: SPRING_CLOUD_CONFIG_SERVER_GIT_URI
            value: "https://github.com/your-org/config-repo"
          - name: SPRING_CLOUD_CONFIG_SERVER_GIT_USERNAME
            valueFrom:
              secretKeyRef:
                name: git-secret
                key: username
          - name: SPRING_CLOUD_CONFIG_SERVER_GIT_PASSWORD
            valueFrom:
              secretKeyRef:
                name: git-secret
                key: password
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
              port: 8888
            initialDelaySeconds: 30
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /actuator/health
              port: 8888
            initialDelaySeconds: 10
            periodSeconds: 10
  ---
  apiVersion: v1
  kind: Service
  metadata:
    name: config-server
    namespace: ecommerce
  spec:
    selector:
      app: config-server
    ports:
    - port: 8888
      targetPort: 8888
  ---
  # Product Service Deployment and Service
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: product-service
    namespace: ecommerce
    labels:
      app: product-service
  spec:
    replicas: 2
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
          ports:
          - containerPort: 8080
          envFrom:
          - configMapRef:
              name: app-config
          env:
          - name: EUREKA_CLIENT_SERVICEURL_DEFAULTZONE
            value: "http://eureka-server:8761/eureka/"
          - name: SPRING_CLOUD_CONFIG_URI
            value: "http://config-server:8888"
          - name: SPRING_DATASOURCE_URL
            value: "jdbc:postgresql://postgres:5432/productdb"
          - name: SPRING_DATASOURCE_USERNAME
            valueFrom:
              secretKeyRef:
                name: db-secret
                key: POSTGRES_USER
          - name: SPRING_DATASOURCE_PASSWORD
            valueFrom:
              secretKeyRef:
                name: db-secret
                key: POSTGRES_PASSWORD
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
  ---
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
  ---
  # HorizontalPodAutoscaler for Product Service
  apiVersion: autoscaling/v2
  kind: HorizontalPodAutoscaler
  metadata:
    name: product-service-hpa
    namespace: ecommerce
  spec:
    scaleTargetRef:
      apiVersion: apps/v1
      kind: Deployment
      name: product-service
    minReplicas: 2
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
  ---
  # API Gateway Deployment and Service
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: api-gateway
    namespace: ecommerce
    labels:
      app: api-gateway
  spec:
    replicas: 2
    selector:
      matchLabels:
        app: api-gateway
    template:
      metadata:
        labels:
          app: api-gateway
      spec:
        containers:
        - name: api-gateway
          image: ecommerce/api-gateway:latest
          ports:
          - containerPort: 8080
          envFrom:
          - configMapRef:
              name: app-config
          env:
          - name: EUREKA_CLIENT_SERVICEURL_DEFAULTZONE
            value: "http://eureka-server:8761/eureka/"
          - name: SPRING_CLOUD_CONFIG_URI
            value: "http://config-server:8888"
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
  ---
  apiVersion: v1
  kind: Service
  metadata:
    name: api-gateway
    namespace: ecommerce
  spec:
    type: LoadBalancer
    selector:
      app: api-gateway
    ports:
    - port: 80
      targetPort: 8080
  ---
  # Ingress for external access
  apiVersion: networking.k8s.io/v1
  kind: Ingress
  metadata:
    name: ecommerce-ingress
    namespace: ecommerce
    annotations:
      nginx.ingress.kubernetes.io/rewrite-target: /
      cert-manager.io/cluster-issuer: "letsencrypt-prod"
  spec:
    ingressClassName: nginx
    tls:
    - hosts:
      - ecommerce.example.com
      secretName: ecommerce-tls
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
  ---
  # Pod Disruption Budget
  apiVersion: policy/v1
  kind: PodDisruptionBudget
  metadata:
    name: api-gateway-pdb
    namespace: ecommerce
  spec:
    minAvailable: 1
    selector:
      matchLabels:
        app: api-gateway
  ```

  ```yaml
  # Helm Chart structure (Chart.yaml)
  apiVersion: v2
  name: ecommerce
  description: A Helm chart for E-commerce Microservices
  type: application
  version: 0.1.0
  appVersion: "1.0.0"

  # values.yaml
  replicaCount: 2

  image:
    repository: ecommerce
    tag: "latest"
    pullPolicy: IfNotPresent

  service:
    type: ClusterIP
    port: 8080

  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 200m
      memory: 256Mi

  config:
    spring:
      profiles:
        active: k8s
    eureka:
      client:
        serviceUrl:
          defaultZone: http://eureka-server:8761/eureka/

  # templates/deployment.yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: {{ include "ecommerce.fullname" . }}
  spec:
    replicas: {{ .Values.replicaCount }}
    selector:
      matchLabels:
        app.kubernetes.io/name: {{ include "ecommerce.name" . }}
    template:
      metadata:
        labels:
          app.kubernetes.io/name: {{ include "ecommerce.name" . }}
      spec:
        containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}/{{ .Chart.Name }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
          - name: http
            containerPort: {{ .Values.service.port }}
            protocol: TCP
          env:
          {{- range $key, $value := .Values.config }}
          - name: {{ $key | upper | replace "-" "_" }}
            value: {{ $value | quote }}
          {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
  ```

  ```bash
  # Kubernetes deployment commands
  # Create namespace
  kubectl create namespace ecommerce

  # Apply all manifests
  kubectl apply -f k8s/

  # Check deployment status
  kubectl get pods -n ecommerce
  kubectl get services -n ecommerce
  kubectl get deployments -n ecommerce

  # Check logs
  kubectl logs -f deployment/product-service -n ecommerce

  # Scale deployment
  kubectl scale deployment product-service --replicas=3 -n ecommerce

  # Rolling update
  kubectl set image deployment/product-service product-service=ecommerce/product-service:v2.0 -n ecommerce

  # Check rollout status
  kubectl rollout status deployment/product-service -n ecommerce

  # Rollback if needed
  kubectl rollout undo deployment/product-service -n ecommerce

  # Port forward for local access
  kubectl port-forward svc/api-gateway 8080:80 -n ecommerce

  # Exec into pod for debugging
  kubectl exec -it deployment/product-service -n ecommerce -- /bin/sh

  # Check resource usage
  kubectl top pods -n ecommerce
  kubectl top nodes

  # Clean up
  kubectl delete namespace ecommerce
  ```

## Project: Containerized E-commerce Microservices on Kubernetes
**Objective:** Containerize the entire e-commerce microservice application and deploy it to a Kubernetes cluster with production-grade configurations.

**Requirements:**
1. Create optimized Docker images for all microservices
2. Set up a complete Docker Compose development environment
3. Deploy the application to Kubernetes with proper resource management
4. Implement horizontal scaling and rolling updates
5. Configure ingress, secrets, and configmaps
6. Set up monitoring and logging for the cluster

**Implementation Steps:**

**1. Docker Image Creation:**
```dockerfile
# Create multi-stage Dockerfiles for each service
# Optimize for size and security
# Include health checks and proper user permissions
```

**2. Docker Compose Development Environment:**
```yaml
# Complete docker-compose.yml with all services
# Include databases, monitoring stack, and networking
# Configure health checks and dependencies
```

**3. Kubernetes Manifests:**
```yaml
# Create deployments, services, and ingress
# Configure ConfigMaps and Secrets
# Set up resource limits and health probes
# Implement HorizontalPodAutoscaler
```

**4. CI/CD Pipeline:**
```yaml
# GitHub Actions or Jenkins pipeline
# Build and push Docker images
# Deploy to Kubernetes cluster
# Run integration tests
```

**5. Monitoring and Observability:**
```yaml
# Prometheus and Grafana setup
# Custom dashboards for microservices
# Alerting rules for critical metrics
# Centralized logging with ELK stack
```

**Deliverables:**
- Optimized Docker images for all microservices
- Complete Docker Compose environment
- Kubernetes manifests for production deployment
- Helm charts for easier deployment
- CI/CD pipeline configuration
- Monitoring dashboards and alerting rules
- Documentation for deployment and scaling procedures

## Learning Outcomes
By the end of this module, students will be able to:
- Create optimized Docker containers for Spring Boot applications
- Design multi-container applications with Docker Compose
- Deploy and manage applications on Kubernetes clusters
- Implement scaling, rolling updates, and self-healing
- Configure Kubernetes networking, storage, and security
- Set up monitoring and logging for containerized applications
- Apply DevOps practices for microservices deployment
- Troubleshoot containerized applications in production

## Resources
- "Docker Deep Dive" by Nigel Poulton
- "Kubernetes in Action" by Marko Luksa
- "The Kubernetes Book" by Nigel Poulton
- Docker Documentation: https://docs.docker.com/
- Kubernetes Documentation: https://kubernetes.io/docs/
- Helm Documentation: https://helm.sh/docs/
- Kubernetes Best Practices: https://learnk8s.io/