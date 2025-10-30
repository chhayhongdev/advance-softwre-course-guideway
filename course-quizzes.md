# Course Quizzes: Mastering Spring Boot Microservices

This document contains multiple-choice quizzes for each module of the Spring Boot Microservices course. Each quiz consists of 8-10 questions designed to test your understanding of the key concepts covered in that module.

## Module 0: Software Development Methodologies Quiz

**Question 1:** Which of the following is NOT a traditional SDLC model?
- A) Waterfall
- B) Spiral
- C) Agile
- D) V-Model

**Question 2:** In Scrum, what is the time-boxed period called where the team works to complete a potentially releasable product increment?
- A) Sprint Planning
- B) Sprint
- C) Daily Scrum
- D) Sprint Review

**Question 3:** Which DevOps principle focuses on "Culture, Automation, Measurement, and Sharing"?
- A) CAMS
- B) CALMS
- C) CARS
- D) CAAMS

**Question 4:** What Git command is used to create a new branch and switch to it simultaneously?
- A) `git branch <branch-name>`
- B) `git checkout -b <branch-name>`
- C) `git switch -c <branch-name>`
- D) `git create-branch <branch-name>`

**Question 5:** Which testing approach involves writing tests before writing the actual code?
- A) Integration Testing
- B) System Testing
- C) Test-Driven Development (TDD)
- D) Acceptance Testing

**Question 6:** What does CI/CD stand for in DevOps?
- A) Continuous Integration / Continuous Deployment
- B) Code Integration / Code Deployment
- C) Continuous Inspection / Continuous Delivery
- D) Code Inspection / Code Delivery

**Question 7:** Which Agile framework uses a visual board to manage work in progress?
- A) Scrum
- B) XP (Extreme Programming)
- C) Kanban
- D) Lean

**Question 8:** What is the primary purpose of code reviews in collaborative development?
- A) To assign blame for bugs
- B) To improve code quality and knowledge sharing
- C) To delay project timelines
- D) To enforce coding standards only

## Pre-Course Module: Java Essentials Quiz

**Question 1:** Which of the following is NOT a primitive data type in Java?
- A) int
- B) String
- C) boolean
- D) double

**Question 2:** What is the correct way to declare an abstract class in Java?
- A) `abstract class MyClass {}`
- B) `class abstract MyClass {}`
- C) `abstract MyClass {}`
- D) `class MyClass abstract {}`

**Question 3:** Which design pattern provides a way to access the elements of an aggregate object sequentially without exposing its underlying representation?
- A) Singleton
- B) Factory
- C) Iterator
- D) Observer

**Question 4:** What is the purpose of the `transient` keyword in Java?
- A) To make a variable thread-safe
- B) To prevent serialization of a field
- C) To declare a constant variable
- D) To create a temporary variable

**Question 5:** Which collection interface maintains insertion order and allows duplicate elements?
- A) Set
- B) Map
- C) List
- D) Queue

**Question 6:** What does the `@Override` annotation indicate?
- A) The method is deprecated
- B) The method overrides a superclass method
- C) The method is overloaded
- D) The method is final

**Question 7:** Which exception handling mechanism automatically closes resources?
- A) try-catch block
- B) try-with-resources
- C) finally block
- D) throw statement

**Question 8:** What is the difference between `==` and `.equals()` in Java?
- A) They are identical
- B) `==` compares references, `.equals()` compares values
- C) `==` compares values, `.equals()` compares references
- D) Both compare references only

## Module 1: Introduction to Microservices Architecture Quiz

**Question 1:** Which of the following is a key benefit of microservices architecture?
- A) Single deployment unit
- B) Tight coupling between services
- C) Independent scalability
- D) Shared database for all services

**Question 2:** What principle ensures that each microservice has a single responsibility?
- A) Loose coupling
- B) High cohesion
- C) Service autonomy
- D) Decentralized data management

**Question 3:** Which Spring Boot annotation is used to mark a class as a REST controller?
- A) `@Service`
- B) `@Component`
- C) `@RestController`
- D) `@Controller`

**Question 4:** What does DDD stand for in the context of microservices?
- A) Distributed Data Design
- B) Domain-Driven Design
- C) Dynamic Deployment Design
- D) Decentralized Database Design

**Question 5:** Which of the following is a disadvantage of microservices?
- A) Easier testing
- B) Independent deployment
- C) Increased complexity in distributed systems
- D) Better fault isolation

**Question 6:** What is the purpose of Spring Boot starters?
- A) To start the application server
- B) To provide pre-configured dependencies
- C) To initialize databases
- D) To create REST endpoints

**Question 7:** Which concept in microservices refers to the ability to deploy services independently?
- A) Service mesh
- B) Independent deployability
- C) API gateway
- D) Service registry

**Question 8:** What is a bounded context in Domain-Driven Design?
- A) A physical boundary of a service
- B) A logical boundary where a domain model is defined and applicable
- C) A network boundary between services
- D) A database boundary for data isolation

## Module 2: Building Core Microservices with Spring Boot Quiz

**Question 1:** Which HTTP method is typically used to create a new resource in REST?
- A) GET
- B) POST
- C) PUT
- D) DELETE

**Question 2:** What annotation is used to map a method to handle HTTP GET requests in Spring?
- A) `@GetMapping`
- B) `@RequestMapping(method = RequestMethod.GET)`
- C) `@Mapping(path = "/", method = GET)`
- D) Both A and B

**Question 3:** Which Spring Data annotation is used to mark a repository interface?
- A) `@Repository`
- B) `@Component`
- C) `@Service`
- D) `@Entity`

**Question 4:** What is the purpose of `@Entity` annotation in JPA?
- A) To mark a class as a database table
- B) To mark a class as a repository
- C) To mark a class as a service
- D) To mark a class as a controller

**Question 5:** Which Spring annotation is used for declarative REST client?
- A) `@RestTemplate`
- B) `@FeignClient`
- C) `@WebClient`
- D) `@HttpClient`

**Question 6:** What pattern does OpenFeign implement for inter-service communication?
- A) Message queuing
- B) Declarative REST client
- C) Event sourcing
- D) Circuit breaker

**Question 7:** Which database is commonly used for document storage in microservices?
- A) PostgreSQL
- B) MySQL
- C) MongoDB
- D) Oracle

**Question 8:** What is the purpose of `@Transactional` annotation?
- A) To mark a method as asynchronous
- B) To manage database transactions
- C) To handle HTTP transactions
- D) To create REST endpoints

## Module 3: Spring Cloud for Distributed Systems Quiz

**Question 1:** What is the primary function of Eureka in Spring Cloud?
- A) API Gateway
- B) Service Discovery
- C) Configuration Management
- D) Circuit Breaker

**Question 2:** Which Spring Cloud component provides centralized configuration management?
- A) Eureka
- B) Zuul
- C) Config Server
- D) Hystrix

**Question 3:** What annotation enables a Spring Boot application to register with Eureka?
- A) `@EnableEurekaServer`
- B) `@EnableEurekaClient`
- C) `@EnableDiscoveryClient`
- D) Both B and C

**Question 4:** Which component acts as an entry point for microservices in Spring Cloud?
- A) Eureka Server
- B) Config Server
- C) API Gateway
- D) Service Registry

**Question 5:** What is the purpose of `@RefreshScope` annotation?
- A) To refresh the application context
- B) To reload configuration properties without restart
- C) To refresh database connections
- D) To reload Spring beans

**Question 6:** Which Spring Cloud Gateway feature allows modifying requests/responses?
- A) Routes
- B) Predicates
- C) Filters
- D) Load Balancer

**Question 7:** What does the term "client-side load balancing" mean?
- A) Load balancer runs on the server
- B) Load balancer runs on the client making requests
- C) Load balancer is external to both client and server
- D) Load balancer uses server-side algorithms

**Question 8:** Which protocol is commonly used for service-to-service communication in Spring Cloud?
- A) HTTP/REST
- B) WebSocket
- C) gRPC
- D) All of the above

## Module 4: Resiliency, Security, and Observability Quiz

**Question 1:** Which pattern prevents cascading failures by temporarily stopping calls to a failing service?
- A) Retry
- B) Circuit Breaker
- C) Bulkhead
- D) Timeout

**Question 2:** What does JWT stand for?
- A) Java Web Token
- B) JSON Web Token
- C) JavaScript Web Token
- D) JSON Web Transfer

**Question 3:** Which Spring Cloud component provides distributed tracing?
- A) Sleuth
- B) Zipkin
- C) Eureka
- D) Config

**Question 4:** What is the purpose of Spring Boot Actuator?
- A) To create REST endpoints
- B) To provide production-ready features like health checks and metrics
- C) To handle security
- D) To manage configurations

**Question 5:** Which authentication method is stateless and commonly used in microservices?
- A) Session-based authentication
- B) Basic authentication
- C) JWT authentication
- D) Form-based authentication

**Question 6:** What is the main purpose of distributed tracing?
- A) To monitor application performance
- B) To track requests across multiple services
- C) To collect application metrics
- D) To handle service discovery

**Question 7:** Which Resilience4j pattern isolates failures to prevent resource exhaustion?
- A) Circuit Breaker
- B) Retry
- C) Rate Limiter
- D) Bulkhead

**Question 8:** What is OAuth2 primarily used for?
- A) Authentication
- B) Authorization delegation
- C) Data encryption
- D) Session management

## Module 5: Containerization and Orchestration Quiz

**Question 1:** What is the primary benefit of containerization for microservices?
- A) Single deployment unit
- B) Consistent environments across stages
- C) Tight coupling
- D) Shared file system

**Question 2:** Which instruction in a Dockerfile creates a new layer with application code?
- A) FROM
- B) COPY
- C) RUN
- D) CMD

**Question 3:** What is the smallest deployable unit in Kubernetes?
- A) Service
- B) Deployment
- C) Pod
- D) Node

**Question 4:** Which Kubernetes object provides load balancing and service discovery?
- A) Pod
- B) Deployment
- C) Service
- D) ConfigMap

**Question 5:** What does the `kubectl apply` command do?
- A) Creates new resources
- B) Updates existing resources or creates new ones
- C) Deletes resources
- D) Lists resources

**Question 6:** Which Docker feature allows building smaller images by separating build and runtime environments?
- A) Multi-stage builds
- B) Docker Compose
- C) Docker Swarm
- D) Docker Registry

**Question 7:** What is the purpose of a Kubernetes ConfigMap?
- A) To store sensitive data
- B) To store non-sensitive configuration data
- C) To manage pod lifecycles
- D) To handle networking

**Question 8:** Which Kubernetes feature automatically scales pods based on CPU/memory usage?
- A) ConfigMap
- B) Secret
- C) HorizontalPodAutoscaler
- D) VerticalPodAutoscaler

## Module 6: Advanced Topics and Best Practices Quiz

**Question 1:** Which pattern manages distributed transactions by coordinating multiple services?
- A) Circuit Breaker
- B) Saga
- C) Event Sourcing
- D) CQRS

**Question 2:** What does CQRS stand for?
- A) Command Query Response Separation
- B) Command Query Responsibility Segregation
- C) Create Query Response System
- D) Client Query Response Service

**Question 3:** Which API versioning strategy uses custom media types?
- A) URI versioning
- B) Query parameter versioning
- C) Header versioning
- D) Media type versioning

**Question 4:** What is the primary purpose of event sourcing?
- A) To cache data
- B) To store state changes as a sequence of events
- C) To replicate databases
- D) To compress data

**Question 5:** Which testing approach verifies contracts between services?
- A) Unit testing
- B) Integration testing
- C) Contract testing
- D) System testing

**Question 6:** What is the benefit of separating read and write models in CQRS?
- A) Reduced complexity
- B) Optimized performance for specific use cases
- C) Easier testing
- D) Better security

**Question 7:** Which cloud platform provides Elastic Kubernetes Service (EKS)?
- A) Google Cloud
- B) Microsoft Azure
- C) Amazon Web Services
- D) IBM Cloud

**Question 8:** What is the purpose of compensating transactions in sagas?
- A) To retry failed operations
- B) To undo completed operations when saga fails
- C) To monitor saga execution
- D) To coordinate saga steps

---

## Answer Key

### Module 0: Software Development Methodologies
1. C) Agile
2. B) Sprint
3. B) CALMS
4. B) `git checkout -b <branch-name>`
5. C) Test-Driven Development (TDD)
6. A) Continuous Integration / Continuous Deployment
7. C) Kanban
8. B) To improve code quality and knowledge sharing

### Pre-Course Module: Java Essentials
1. B) String
2. A) `abstract class MyClass {}`
3. C) Iterator
4. B) To prevent serialization of a field
5. C) List
6. B) The method overrides a superclass method
7. B) try-with-resources
8. B) `==` compares references, `.equals()` compares values

### Module 1: Introduction to Microservices Architecture
1. C) Independent scalability
2. C) Service autonomy
3. C) `@RestController`
4. B) Domain-Driven Design
5. C) Increased complexity in distributed systems
6. B) To provide pre-configured dependencies
7. B) Independent deployability
8. B) A logical boundary where a domain model is defined and applicable

### Module 2: Building Core Microservices with Spring Boot
1. B) POST
2. D) Both A and B
3. A) `@Repository`
4. A) To mark a class as a database table
5. B) `@FeignClient`
6. B) Declarative REST client
7. C) MongoDB
8. B) To manage database transactions

### Module 3: Spring Cloud for Distributed Systems
1. B) Service Discovery
2. C) Config Server
3. D) Both B and C
4. C) API Gateway
5. B) To reload configuration properties without restart
6. C) Filters
7. B) Load balancer runs on the client making requests
8. D) All of the above

### Module 4: Resiliency, Security, and Observability
1. B) Circuit Breaker
2. B) JSON Web Token
3. A) Sleuth
4. B) To provide production-ready features like health checks and metrics
5. C) JWT authentication
6. B) To track requests across multiple services
7. D) Bulkhead
8. B) Authorization delegation

### Module 5: Containerization and Orchestration
1. B) Consistent environments across stages
2. B) COPY
3. C) Pod
4. C) Service
5. B) Updates existing resources or creates new ones
6. A) Multi-stage builds
7. B) To store non-sensitive configuration data
8. C) HorizontalPodAutoscaler

### Module 6: Advanced Topics and Best Practices
1. B) Saga
2. B) Command Query Responsibility Segregation
3. D) Media type versioning
4. B) To store state changes as a sequence of events
5. C) Contract testing
6. B) Optimized performance for specific use cases
7. C) Amazon Web Services
8. B) To undo completed operations when saga fails

---

## Quiz Instructions

- Each quiz contains 8 multiple-choice questions
- Questions are designed to test key concepts from each module
- Answers are provided in the Answer Key section above
- Use these quizzes to assess your understanding before moving to the next module
- Consider discussing incorrect answers with peers or instructors for deeper understanding
- These quizzes can be used as study guides for certification preparation

## Scoring Guide

- 8/8 correct: Excellent understanding - proceed to next module
- 6-7/8 correct: Good understanding - review weak areas before proceeding
- 4-5/8 correct: Basic understanding - revisit module content
- 0-3/8 correct: Needs significant review - go back and study the module thoroughly