# Module 1: Introduction to Microservices Architecture

## Overview
This module provides a foundational understanding of microservices architecture, contrasting it with traditional monolithic approaches. Students will learn the core principles of microservices, their benefits and challenges, and get hands-on experience with Spring Boot to create their first microservice.

## Topics

### Monolith vs. Microservices
- **Understanding monolithic architecture and its limitations:**
  - Monolithic architecture: A single, unified application where all components are tightly coupled
  - Deployment challenges: Entire application must be redeployed for any change
  - Scaling difficulties: Can't scale individual components independently
  - Technology lock-in: All components must use the same technology stack
  - Development bottlenecks: Large teams working on the same codebase
  
- **Advantages and disadvantages of monolithic applications:**
  - **Advantages:**
    - Simple development and deployment initially
    - Easier testing and debugging
    - Better performance due to in-process communication
    - Simpler transaction management
  - **Disadvantages:**
    - Tight coupling makes changes risky
    - Scaling requires scaling the entire application
    - Long deployment cycles
    - Technology stack limitations
    - Difficulty in adopting new technologies

- **Introduction to microservices architecture:**
  - Microservices: Independently deployable services that work together
  - Each service focuses on a specific business capability
  - Services communicate via APIs (typically HTTP/REST)
  - Decentralized data management
  - Technology diversity allowed

- **Benefits of microservices (scalability, flexibility, technology diversity):**
  - **Scalability:** Scale individual services based on demand
  - **Flexibility:** Teams can work independently with different technologies
  - **Technology Diversity:** Choose the best tool for each job
  - **Fault Isolation:** Failure in one service doesn't bring down the entire system
  - **Continuous Deployment:** Deploy services independently
  - **Team Autonomy:** Small, cross-functional teams own services

- **Trade-offs, challenges, and when to choose each approach:**
  - **Trade-offs:**
    - Increased complexity in deployment and monitoring
    - Distributed system challenges (network latency, data consistency)
    - Higher operational overhead
    - More complex testing strategies
  - **Challenges:**
    - Service discovery and communication
    - Distributed transactions
    - Data consistency across services
    - Monitoring and debugging distributed systems
  - **When to choose:**
    - **Monolith:** Small teams, simple applications, predictable scaling needs
    - **Microservices:** Large applications, diverse scaling needs, multiple teams, need for technology flexibility

### Core Microservices Concepts
- **Loose coupling and high cohesion principles:**
  - **High Cohesion:** Related functionality grouped together within a service
  - **Loose Coupling:** Minimal dependencies between services
  - Benefits: Easier maintenance, independent deployment, fault isolation
  - Implementation: Clear service boundaries, well-defined APIs

- **Independent deployability and continuous delivery:**
  - Each service can be deployed independently without affecting others
  - Enables continuous delivery pipelines
  - Faster release cycles and reduced risk
  - Requires automated testing and deployment processes

- **Bounded contexts in domain-driven design (DDD):**
  - Bounded Context: A boundary within which a particular domain model applies
  - Each microservice should align with a bounded context
  - Prevents domain model pollution across services
  - Enables teams to focus on specific business domains

- **Service autonomy, single responsibility, and decentralized data management:**
  - **Service Autonomy:** Services are self-contained and make their own decisions
  - **Single Responsibility:** Each service has one primary responsibility
  - **Decentralized Data:** Each service manages its own data
  - Benefits: Independent evolution, technology choices, scalability
  - Challenges: Data consistency, cross-service queries

### Getting Started with Spring Boot
- **Spring Boot fundamentals and ecosystem overview:**
  - Spring Boot: Framework for creating production-ready applications quickly
  - Convention over configuration approach
  - Embedded servers (Tomcat, Jetty)
  - Auto-configuration based on classpath dependencies
  - Extensive ecosystem: Spring Cloud, Spring Data, Spring Security

- **Dependency management using Maven or Gradle:**
  - Maven: XML-based build tool with pom.xml
  - Gradle: Groovy/Kotlin-based build tool with build.gradle
  - Dependency resolution and transitive dependencies
  - Build lifecycle management

- **Auto-configuration, starters, and convention over configuration:**
  - **Starters:** Pre-configured dependencies for common use cases
  - **Auto-configuration:** Automatic bean configuration based on classpath
  - **Convention over Configuration:** Sensible defaults reduce boilerplate
  - Example: Adding spring-boot-starter-web automatically configures Tomcat and Spring MVC

- **Creating a basic REST API with Spring Boot annotations:**
  - @SpringBootApplication: Main application class
  - @RestController: Marks class as REST controller
  - @RequestMapping: Maps HTTP requests to methods
  - @GetMapping, @PostMapping, etc.: HTTP method specific mappings
  - @RequestBody, @PathVariable, @RequestParam: Parameter binding

  ```java
  // Basic Spring Boot Application
  import org.springframework.boot.SpringApplication;
  import org.springframework.boot.autoconfigure.SpringBootApplication;
  import org.springframework.web.bind.annotation.*;
  import java.util.*;

  @SpringBootApplication
  public class HelloMicroserviceApplication {
      public static void main(String[] args) {
          SpringApplication.run(HelloMicroserviceApplication.class, args);
      }
  }

  // REST Controller
  @RestController
  @RequestMapping("/api/hello")
  class HelloController {
      
      // GET /api/hello
      @GetMapping
      public String sayHello() {
          return "Hello from Microservice!";
      }
      
      // GET /api/hello/{name}
      @GetMapping("/{name}")
      public String sayHelloTo(@PathVariable String name) {
          return "Hello, " + name + "!";
      }
      
      // POST /api/hello
      @PostMapping
      public Map<String, String> createGreeting(@RequestBody Map<String, String> request) {
          Map<String, String> response = new HashMap<>();
          response.put("message", "Hello, " + request.get("name") + "!");
          response.put("timestamp", new Date().toString());
          return response;
      }
      
      // GET /api/hello/greetings
      @GetMapping("/greetings")
      public List<String> getGreetings() {
          return Arrays.asList("Hello", "Hi", "Greetings", "Welcome");
      }
  }
  ```

  ```xml
  <!-- pom.xml for Maven -->
  <?xml version="1.0" encoding="UTF-8"?>
  <project xmlns="http://maven.apache.org/POM/4.0.0"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
           http://maven.apache.org/xsd/maven-4.0.0.xsd">
      <modelVersion>4.0.0</modelVersion>
      
      <parent>
          <groupId>org.springframework.boot</groupId>
          <artifactId>spring-boot-starter-parent</artifactId>
          <version>3.1.0</version>
          <relativePath/>
      </parent>
      
      <groupId>com.example</groupId>
      <artifactId>hello-microservice</artifactId>
      <version>0.0.1-SNAPSHOT</version>
      
      <properties>
          <java.version>17</java.version>
      </properties>
      
      <dependencies>
          <dependency>
              <groupId>org.springframework.boot</groupId>
              <artifactId>spring-boot-starter-web</artifactId>
          </dependency>
          
          <dependency>
              <groupId>org.springframework.boot</groupId>
              <artifactId>spring-boot-starter-test</artifactId>
              <scope>test</scope>
          </dependency>
      </dependencies>
      
      <build>
          <plugins>
              <plugin>
                  <groupId>org.springframework.boot</groupId>
                  <artifactId>spring-boot-maven-plugin</artifactId>
              </plugin>
          </plugins>
      </build>
  </project>
  ```

  ```gradle
  // build.gradle for Gradle
  plugins {
      id 'java'
      id 'org.springframework.boot' version '3.1.0'
      id 'io.spring.dependency-management' version '1.1.0'
  }
  
  group = 'com.example'
  version = '0.0.1-SNAPSHOT'
  sourceCompatibility = '17'
  
  repositories {
      mavenCentral()
  }
  
  dependencies {
      implementation 'org.springframework.boot:spring-boot-starter-web'
      testImplementation 'org.springframework.boot:spring-boot-starter-test'
  }
  
  tasks.named('test') {
      useJUnitPlatform()
  }
  ```

## Project: Hello World Microservice
**Objective:** Create and deploy a simple REST API microservice using Spring Boot.

**Requirements:**
1. Set up a new Spring Boot project using Maven or Gradle
2. Create REST endpoints for basic CRUD operations on a "Message" resource
3. Implement proper HTTP status codes and error handling
4. Add request/response logging
5. Package and run the application

**Implementation Steps:**

```java
// Message.java - Entity class
public class Message {
    private Long id;
    private String content;
    private String author;
    private LocalDateTime timestamp;
    
    // Constructors, getters, setters
    public Message() {}
    
    public Message(String content, String author) {
        this.content = content;
        this.author = author;
        this.timestamp = LocalDateTime.now();
    }
    
    // Getters and setters...
}

// MessageController.java - REST Controller
@RestController
@RequestMapping("/api/messages")
public class MessageController {
    
    private List<Message> messages = new ArrayList<>();
    private Long nextId = 1L;
    
    @GetMapping
    public List<Message> getAllMessages() {
        return messages;
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Message> getMessageById(@PathVariable Long id) {
        return messages.stream()
            .filter(msg -> msg.getId().equals(id))
            .findFirst()
            .map(msg -> ResponseEntity.ok(msg))
            .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<Message> createMessage(@RequestBody Message message) {
        message.setId(nextId++);
        messages.add(message);
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Message> updateMessage(@PathVariable Long id, @RequestBody Message updatedMessage) {
        for (int i = 0; i < messages.size(); i++) {
            if (messages.get(i).getId().equals(id)) {
                updatedMessage.setId(id);
                messages.set(i, updatedMessage);
                return ResponseEntity.ok(updatedMessage);
            }
        }
        return ResponseEntity.notFound().build();
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable Long id) {
        boolean removed = messages.removeIf(msg -> msg.getId().equals(id));
        return removed ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
```

**Testing the API:**

```bash
# Start the application
mvn spring-boot:run
# or
gradle bootRun

# Test endpoints
curl -X GET http://localhost:8080/api/messages
curl -X POST http://localhost:8080/api/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello Microservices!","author":"Student"}'
curl -X GET http://localhost:8080/api/messages/1
```

**Deliverables:**
- Complete Spring Boot project with source code
- Working REST API with all CRUD operations
- Proper project structure and build configuration
- Documentation of API endpoints and usage examples
- Demonstration of the running application

## Learning Outcomes
By the end of this module, students will be able to:
- Explain the differences between monolithic and microservices architectures
- Identify when to use microservices vs monolithic approaches
- Understand core microservices principles and patterns
- Set up and configure a Spring Boot project
- Create REST APIs using Spring Boot annotations
- Package and run Spring Boot applications
- Test REST endpoints using tools like curl

## Resources
- "Building Microservices" by Sam Newman
- "Microservices Patterns" by Chris Richardson
- Spring Boot Documentation: https://spring.io/projects/spring-boot
- Spring Initializr: https://start.spring.io/
- REST API Design Guidelines: https://restfulapi.net/
- Postman for API Testing: https://www.postman.com/