# Module 7: Spring WebFlux Basics

## Overview
This module introduces Spring WebFlux, the reactive web framework in Spring Framework 5+. You'll learn the fundamentals of reactive programming, reactive streams, and how to build non-blocking web applications using Spring WebFlux.

## Topics

### Introduction to Reactive Programming
- **What is Reactive Programming?**
  - Reactive Manifesto principles
  - Asynchronous and non-blocking operations
  - Event-driven architecture
  
  ```java
  // Traditional synchronous approach
  public String getUserData(String userId) {
      // Blocking call - thread waits for response
      User user = userRepository.findById(userId).get();
      return user.getName();
  }
  
  // Reactive approach
  public Mono<String> getUserDataReactive(String userId) {
      // Non-blocking - returns immediately, processes asynchronously
      return userRepository.findById(userId)
                          .map(User::getName);
  }
  ```

- **Reactive Streams Specification:**
  - Publisher, Subscriber, Subscription interfaces
  - Backpressure mechanism
  - Demand-driven data flow
  
  ```java
  // Reactive Streams interfaces
  public interface Publisher<T> {
      void subscribe(Subscriber<? super T> subscriber);
  }
  
  public interface Subscriber<T> {
      void onSubscribe(Subscription subscription);
      void onNext(T item);
      void onError(Throwable throwable);
      void onComplete();
  }
  
  public interface Subscription {
      void request(long n);  // Request n items
      void cancel();          // Cancel subscription
  }
  ```

### Project Reactor Fundamentals
- **Flux and Mono:**
  - Flux: 0 to N elements stream
  - Mono: 0 to 1 element stream
  - Creating reactive streams
  
  ```java
  import reactor.core.publisher.Flux;
  import reactor.core.publisher.Mono;
  
  public class ReactorBasics {
      public static void main(String[] args) {
          // Creating Flux (0 to N elements)
          Flux<String> stringFlux = Flux.just("Hello", "World", "Reactive");
          
          // Creating Mono (0 to 1 element)
          Mono<String> stringMono = Mono.just("Single Value");
          
          // Creating empty streams
          Flux<String> emptyFlux = Flux.empty();
          Mono<String> emptyMono = Mono.empty();
          
          // Creating from collections
          List<String> names = Arrays.asList("Alice", "Bob", "Charlie");
          Flux<String> namesFlux = Flux.fromIterable(names);
          
          // Creating from range
          Flux<Integer> numbers = Flux.range(1, 10);
          
          // Creating from Callable (lazy)
          Mono<String> callableMono = Mono.fromCallable(() -> {
              System.out.println("Computing...");
              return "Result";
          });
      }
  }
  ```

- **Operators and Transformations:**
  - Map, flatMap, filter operations
  - Combining streams
  - Error handling
  
  ```java
  public class ReactorOperators {
      public static void main(String[] args) {
          // Map operator
          Flux<String> names = Flux.just("alice", "bob", "charlie")
                                  .map(String::toUpperCase);
          // Result: ALICE, BOB, CHARLIE
          
          // Filter operator
          Flux<String> filteredNames = names.filter(name -> name.length() > 3);
          // Result: ALICE, CHARLIE
          
          // FlatMap operator (for nested streams)
          Flux<String> words = Flux.just("Hello World", "Reactive Programming")
                                  .flatMap(sentence -> Flux.fromArray(sentence.split(" ")));
          // Result: Hello, World, Reactive, Programming
          
          // Combine streams
          Flux<String> combined = Flux.merge(
              Flux.just("A", "B"),
              Flux.just("C", "D")
          );
          // Result: A, B, C, D (order may vary)
          
          // Zip streams
          Flux<String> zipped = Flux.zip(
              Flux.just("A", "B", "C"),
              Flux.just("1", "2", "3"),
              (letter, number) -> letter + number
          );
          // Result: A1, B2, C3
      }
  }
  ```

### Spring WebFlux Core Concepts
- **Functional Endpoints:**
  - RouterFunction and HandlerFunction
  - Functional programming model
  - Request/response handling
  
  ```java
  import org.springframework.context.annotation.Bean;
  import org.springframework.context.annotation.Configuration;
  import org.springframework.web.reactive.function.server.RouterFunction;
  import org.springframework.web.reactive.function.server.ServerResponse;
  import static org.springframework.web.reactive.function.server.RouterFunctions.route;
  import static org.springframework.web.reactive.function.server.RequestPredicates.*;
  
  @Configuration
  public class FunctionalEndpointsConfig {
      
      @Bean
      public RouterFunction<ServerResponse> userRoutes(UserHandler handler) {
          return route(GET("/api/users"), handler::getAllUsers)
                 .andRoute(GET("/api/users/{id}"), handler::getUserById)
                 .andRoute(POST("/api/users"), handler::createUser)
                 .andRoute(PUT("/api/users/{id}"), handler::updateUser)
                 .andRoute(DELETE("/api/users/{id}"), handler::deleteUser);
      }
  }
  
  @Component
  public class UserHandler {
      
      private final UserService userService;
      
      public UserHandler(UserService userService) {
          this.userService = userService;
      }
      
      public Mono<ServerResponse> getAllUsers(ServerRequest request) {
          return userService.getAllUsers()
                           .collectList()
                           .flatMap(users -> ServerResponse.ok()
                                                         .contentType(MediaType.APPLICATION_JSON)
                                                         .bodyValue(users));
      }
      
      public Mono<ServerResponse> getUserById(ServerRequest request) {
          String userId = request.pathVariable("id");
          return userService.getUserById(userId)
                           .flatMap(user -> ServerResponse.ok()
                                                        .contentType(MediaType.APPLICATION_JSON)
                                                        .bodyValue(user))
                           .switchIfEmpty(ServerResponse.notFound().build());
      }
      
      public Mono<ServerResponse> createUser(ServerRequest request) {
          return request.bodyToMono(User.class)
                       .flatMap(userService::createUser)
                       .flatMap(user -> ServerResponse.created(
                           URI.create("/api/users/" + user.getId()))
                           .contentType(MediaType.APPLICATION_JSON)
                           .bodyValue(user));
      }
      
      public Mono<ServerResponse> updateUser(ServerRequest request) {
          String userId = request.pathVariable("id");
          return request.bodyToMono(User.class)
                       .flatMap(user -> userService.updateUser(userId, user))
                       .flatMap(user -> ServerResponse.ok()
                                                    .contentType(MediaType.APPLICATION_JSON)
                                                    .bodyValue(user))
                       .switchIfEmpty(ServerResponse.notFound().build());
      }
      
      public Mono<ServerResponse> deleteUser(ServerRequest request) {
          String userId = request.pathVariable("id");
          return userService.deleteUser(userId)
                           .then(ServerResponse.noContent().build())
                           .switchIfEmpty(ServerResponse.notFound().build());
      }
  }
  ```

- **Annotated Controllers:**
  - @RestController with reactive return types
  - @GetMapping, @PostMapping, etc.
  - Request/response body handling
  
  ```java
  import org.springframework.web.bind.annotation.*;
  import reactor.core.publisher.Flux;
  import reactor.core.publisher.Mono;
  
  @RestController
  @RequestMapping("/api/products")
  public class ProductController {
      
      private final ProductService productService;
      
      public ProductController(ProductService productService) {
          this.productService = productService;
      }
      
      @GetMapping
      public Flux<Product> getAllProducts() {
          return productService.getAllProducts();
      }
      
      @GetMapping("/{id}")
      public Mono<Product> getProductById(@PathVariable String id) {
          return productService.getProductById(id);
      }
      
      @GetMapping("/search")
      public Flux<Product> searchProducts(@RequestParam String name) {
          return productService.searchProductsByName(name);
      }
      
      @PostMapping
      @ResponseStatus(HttpStatus.CREATED)
      public Mono<Product> createProduct(@RequestBody Product product) {
          return productService.createProduct(product);
      }
      
      @PutMapping("/{id}")
      public Mono<Product> updateProduct(@PathVariable String id, 
                                       @RequestBody Product product) {
          return productService.updateProduct(id, product);
      }
      
      @DeleteMapping("/{id}")
      @ResponseStatus(HttpStatus.NO_CONTENT)
      public Mono<Void> deleteProduct(@PathVariable String id) {
          return productService.deleteProduct(id);
      }
      
      @GetMapping("/stream")
      public Flux<Product> streamProducts() {
          return productService.getAllProducts()
                              .delayElements(Duration.ofSeconds(1)); // Simulate streaming
      }
  }
  ```

### Reactive Data Access
- **Reactive Repositories:**
  - ReactiveCrudRepository
  - ReactiveMongoRepository
  - ReactiveJpaRepository
  
  ```java
  import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
  import org.springframework.data.repository.reactive.ReactiveCrudRepository;
  import reactor.core.publisher.Flux;
  import reactor.core.publisher.Mono;
  
  // Reactive Repository Interface
  public interface ProductRepository extends ReactiveMongoRepository<Product, String> {
      
      // Custom reactive query methods
      Flux<Product> findByCategory(String category);
      
      Flux<Product> findByPriceBetween(double minPrice, double maxPrice);
      
      Mono<Product> findByName(String name);
      
      Flux<Product> findByNameContainingIgnoreCase(String namePattern);
      
      // Using @Query annotation
      @Query("{ 'price' : { $gte: ?0, $lte: ?1 } }")
      Flux<Product> findProductsInPriceRange(double minPrice, double maxPrice);
  }
  
  // Service layer with reactive operations
  @Service
  public class ProductService {
      
      private final ProductRepository productRepository;
      
      public ProductService(ProductRepository productRepository) {
          this.productRepository = productRepository;
      }
      
      public Flux<Product> getAllProducts() {
          return productRepository.findAll();
      }
      
      public Mono<Product> getProductById(String id) {
          return productRepository.findById(id);
      }
      
      public Flux<Product> getProductsByCategory(String category) {
          return productRepository.findByCategory(category);
      }
      
      public Flux<Product> searchProducts(String query) {
          return productRepository.findByNameContainingIgnoreCase(query);
      }
      
      public Mono<Product> createProduct(Product product) {
          return productRepository.save(product);
      }
      
      public Mono<Product> updateProduct(String id, Product updatedProduct) {
          return productRepository.findById(id)
                                 .flatMap(existingProduct -> {
                                     existingProduct.setName(updatedProduct.getName());
                                     existingProduct.setPrice(updatedProduct.getPrice());
                                     existingProduct.setCategory(updatedProduct.getCategory());
                                     return productRepository.save(existingProduct);
                                 });
      }
      
      public Mono<Void> deleteProduct(String id) {
          return productRepository.deleteById(id);
      }
      
      // Complex reactive operations
      public Flux<Product> getExpensiveProductsByCategory(String category, double minPrice) {
          return productRepository.findByCategory(category)
                                 .filter(product -> product.getPrice() >= minPrice)
                                 .sort((p1, p2) -> Double.compare(p2.getPrice(), p1.getPrice()));
      }
  }
  ```

### Error Handling and Validation
- **Reactive Error Handling:**
  - onErrorResume, onErrorReturn
  - Global error handling
  - Custom exceptions
  
  ```java
  import org.springframework.web.bind.annotation.ExceptionHandler;
  import org.springframework.web.bind.annotation.RestControllerAdvice;
  
  // Custom exceptions
  public class ProductNotFoundException extends RuntimeException {
      public ProductNotFoundException(String id) {
          super("Product not found with id: " + id);
      }
  }
  
  public class InvalidProductException extends RuntimeException {
      public InvalidProductException(String message) {
          super(message);
      }
  }
  
  // Global error handler
  @RestControllerAdvice
  public class GlobalExceptionHandler {
      
      @ExceptionHandler(ProductNotFoundException.class)
      public Mono<ResponseEntity<ErrorResponse>> handleProductNotFound(ProductNotFoundException ex) {
          ErrorResponse error = new ErrorResponse("PRODUCT_NOT_FOUND", ex.getMessage());
          return Mono.just(ResponseEntity.status(HttpStatus.NOT_FOUND).body(error));
      }
      
      @ExceptionHandler(InvalidProductException.class)
      public Mono<ResponseEntity<ErrorResponse>> handleInvalidProduct(InvalidProductException ex) {
          ErrorResponse error = new ErrorResponse("INVALID_PRODUCT", ex.getMessage());
          return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error));
      }
      
      @ExceptionHandler(Exception.class)
      public Mono<ResponseEntity<ErrorResponse>> handleGenericException(Exception ex) {
          ErrorResponse error = new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred");
          return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error));
      }
  }
  
  // Error response model
  public class ErrorResponse {
      private String errorCode;
      private String message;
      private LocalDateTime timestamp;
      
      public ErrorResponse(String errorCode, String message) {
          this.errorCode = errorCode;
          this.message = message;
          this.timestamp = LocalDateTime.now();
      }
      
      // Getters and setters
  }
  
  // Service with error handling
  @Service
  public class ProductService {
      
      private final ProductRepository productRepository;
      
      public ProductService(ProductRepository productRepository) {
          this.productRepository = productRepository;
      }
      
      public Mono<Product> getProductById(String id) {
          return productRepository.findById(id)
                                 .switchIfEmpty(Mono.error(new ProductNotFoundException(id)));
      }
      
      public Mono<Product> createProduct(Product product) {
          return Mono.just(product)
                     .flatMap(this::validateProduct)
                     .flatMap(productRepository::save)
                     .onErrorResume(IllegalArgumentException.class, 
                                   ex -> Mono.error(new InvalidProductException(ex.getMessage())));
      }
      
      private Mono<Product> validateProduct(Product product) {
          if (product.getName() == null || product.getName().trim().isEmpty()) {
              return Mono.error(new IllegalArgumentException("Product name cannot be empty"));
          }
          if (product.getPrice() <= 0) {
              return Mono.error(new IllegalArgumentException("Product price must be positive"));
          }
          return Mono.just(product);
      }
  }
  ```

### Testing Reactive Applications
- **Testing Reactive Controllers:**
  - WebTestClient
  - StepVerifier for reactive streams
  - Testing reactive repositories
  
  ```java
  import org.junit.jupiter.api.Test;
  import org.springframework.beans.factory.annotation.Autowired;
  import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
  import org.springframework.boot.test.mock.mockito.MockBean;
  import org.springframework.test.web.reactive.server.WebTestClient;
  import reactor.core.publisher.Flux;
  import reactor.core.publisher.Mono;
  import reactor.test.StepVerifier;
  import static org.mockito.ArgumentMatchers.any;
  import static org.mockito.Mockito.when;
  
  @WebFluxTest(ProductController.class)
  public class ProductControllerTest {
      
      @Autowired
      private WebTestClient webTestClient;
      
      @MockBean
      private ProductService productService;
      
      @Test
      public void testGetAllProducts() {
          Product product1 = new Product("1", "Laptop", 999.99, "Electronics");
          Product product2 = new Product("2", "Book", 29.99, "Education");
          
          when(productService.getAllProducts()).thenReturn(Flux.just(product1, product2));
          
          webTestClient.get()
                      .uri("/api/products")
                      .exchange()
                      .expectStatus().isOk()
                      .expectBodyList(Product.class)
                      .hasSize(2);
      }
      
      @Test
      public void testGetProductById() {
          Product product = new Product("1", "Laptop", 999.99, "Electronics");
          
          when(productService.getProductById("1")).thenReturn(Mono.just(product));
          
          webTestClient.get()
                      .uri("/api/products/1")
                      .exchange()
                      .expectStatus().isOk()
                      .expectBody(Product.class)
                      .isEqualTo(product);
      }
      
      @Test
      public void testGetProductById_NotFound() {
          when(productService.getProductById("999")).thenReturn(Mono.empty());
          
          webTestClient.get()
                      .uri("/api/products/999")
                      .exchange()
                      .expectStatus().isNotFound();
      }
      
      @Test
      public void testCreateProduct() {
          Product newProduct = new Product(null, "Mouse", 29.99, "Electronics");
          Product savedProduct = new Product("1", "Mouse", 29.99, "Electronics");
          
          when(productService.createProduct(any(Product.class))).thenReturn(Mono.just(savedProduct));
          
          webTestClient.post()
                      .uri("/api/products")
                      .contentType(MediaType.APPLICATION_JSON)
                      .bodyValue(newProduct)
                      .exchange()
                      .expectStatus().isCreated()
                      .expectBody(Product.class)
                      .isEqualTo(savedProduct);
      }
  }
  
  // Testing reactive streams with StepVerifier
  public class ReactiveStreamsTest {
      
      @Test
      public void testFluxOperations() {
          Flux<String> flux = Flux.just("hello", "world", "reactive")
                                 .map(String::toUpperCase)
                                 .filter(s -> s.length() > 4);
          
          StepVerifier.create(flux)
                      .expectNext("HELLO")
                      .expectNext("WORLD")
                      .expectNext("REACTIVE")
                      .verifyComplete();
      }
      
      @Test
      public void testMonoOperations() {
          Mono<String> mono = Mono.just("test")
                                 .map(String::toUpperCase);
          
          StepVerifier.create(mono)
                      .expectNext("TEST")
                      .verifyComplete();
      }
      
      @Test
      public void testErrorHandling() {
          Mono<String> errorMono = Mono.error(new RuntimeException("Test error"));
          
          StepVerifier.create(errorMono)
                      .expectError(RuntimeException.class)
                      .verify();
      }
  }
  ```

## Project: Reactive Product Catalog API
**Objective:** Build a reactive REST API for a product catalog using Spring WebFlux.

**Requirements:**
1. Create reactive endpoints for CRUD operations
2. Implement reactive data access with MongoDB
3. Add proper error handling and validation
4. Include comprehensive tests
5. Demonstrate reactive stream operations

**Implementation:**

```java
// Product Model
@Document(collection = "products")
public class Product {
    @Id
    private String id;
    private String name;
    private double price;
    private String category;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Constructors, getters, setters
}

// Repository
public interface ProductRepository extends ReactiveMongoRepository<Product, String> {
    Flux<Product> findByCategory(String category);
    Flux<Product> findByPriceBetween(double minPrice, double maxPrice);
    Flux<Product> findByNameContainingIgnoreCase(String name);
}

// Service
@Service
public class ProductService {
    private final ProductRepository productRepository;
    
    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }
    
    public Flux<Product> getAllProducts() {
        return productRepository.findAll();
    }
    
    public Mono<Product> getProductById(String id) {
        return productRepository.findById(id)
                               .switchIfEmpty(Mono.error(new ProductNotFoundException(id)));
    }
    
    public Flux<Product> getProductsByCategory(String category) {
        return productRepository.findByCategory(category);
    }
    
    public Flux<Product> searchProducts(String query) {
        return productRepository.findByNameContainingIgnoreCase(query);
    }
    
    public Mono<Product> createProduct(Product product) {
        product.setCreatedAt(LocalDateTime.now());
        product.setUpdatedAt(LocalDateTime.now());
        return productRepository.save(product);
    }
    
    public Mono<Product> updateProduct(String id, Product updatedProduct) {
        return productRepository.findById(id)
                               .switchIfEmpty(Mono.error(new ProductNotFoundException(id)))
                               .flatMap(existingProduct -> {
                                   existingProduct.setName(updatedProduct.getName());
                                   existingProduct.setPrice(updatedProduct.getPrice());
                                   existingProduct.setCategory(updatedProduct.getCategory());
                                   existingProduct.setDescription(updatedProduct.getDescription());
                                   existingProduct.setUpdatedAt(LocalDateTime.now());
                                   return productRepository.save(existingProduct);
                               });
    }
    
    public Mono<Void> deleteProduct(String id) {
        return productRepository.findById(id)
                               .switchIfEmpty(Mono.error(new ProductNotFoundException(id)))
                               .then(productRepository.deleteById(id));
    }
}

// Controller
@RestController
@RequestMapping("/api/products")
public class ProductController {
    
    private final ProductService productService;
    
    public ProductController(ProductService productService) {
        this.productService = productService;
    }
    
    @GetMapping
    public Flux<Product> getAllProducts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {
        
        if (category != null) {
            return productService.getProductsByCategory(category);
        } else if (search != null) {
            return productService.searchProducts(search);
        } else {
            return productService.getAllProducts();
        }
    }
    
    @GetMapping("/{id}")
    public Mono<Product> getProductById(@PathVariable String id) {
        return productService.getProductById(id);
    }
    
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<Product> createProduct(@Valid @RequestBody Product product) {
        return productService.createProduct(product);
    }
    
    @PutMapping("/{id}")
    public Mono<Product> updateProduct(@PathVariable String id, 
                                     @Valid @RequestBody Product product) {
        return productService.updateProduct(id, product);
    }
    
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteProduct(@PathVariable String id) {
        return productService.deleteProduct(id);
    }
    
    @GetMapping("/stream")
    public Flux<Product> streamProducts() {
        return productService.getAllProducts()
                            .delayElements(Duration.ofMillis(500));
    }
}
```

## Learning Outcomes
By the end of this module, students will be able to:
- Understand reactive programming principles and the Reactive Manifesto
- Work with Project Reactor's Flux and Mono types
- Build reactive REST APIs using Spring WebFlux
- Implement reactive data access with MongoDB
- Handle errors and validation in reactive applications
- Test reactive applications using WebTestClient and StepVerifier
- Create non-blocking, scalable web applications

## Resources
- Spring WebFlux Documentation: https://docs.spring.io/spring-framework/docs/current/reference/html/web-reactive.html
- Project Reactor Documentation: https://projectreactor.io/docs/core/release/reference/
- Reactive Streams Specification: https://www.reactive-streams.org/
- "Reactive Programming with RxJava" by Tomasz Nurkiewicz</content>
<parameter name="filePath">/Users/chhayhong/Desktop/spring-boot-course/module-7-spring-webflux-basics.md