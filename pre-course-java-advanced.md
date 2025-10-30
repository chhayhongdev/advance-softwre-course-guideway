# Pre-Course Module: Advanced Java Concepts

## Overview
This module covers advanced Java features and concepts essential for modern application development. It focuses on functional programming with lambdas, file I/O operations, multithreading, networking, and advanced I/O patterns that are crucial for building robust, scalable applications.

## Topics

### Lambda Expressions and Functional Programming
- **Lambda expressions and functional interfaces:**
  - Syntax and usage
  - Functional interfaces (@FunctionalInterface)
  - Method references
  
  ```java
  // Example: Lambda expressions
  import java.util.*;
  import java.util.function.*;
  
  @FunctionalInterface
  interface Calculator {
      int operate(int a, int b);
  }
  
  public class LambdaDemo {
      public static void main(String[] args) {
          // Lambda expression
          Calculator addition = (a, b) -> a + b;
          Calculator multiplication = (a, b) -> a * b;
          
          System.out.println("5 + 3 = " + addition.operate(5, 3));       // 8
          System.out.println("5 * 3 = " + multiplication.operate(5, 3)); // 15
          
          // Method reference
          List<String> names = Arrays.asList("Alice", "Bob", "Charlie");
          names.forEach(System.out::println);  // Method reference
          
          // Built-in functional interfaces
          Predicate<String> isLongName = name -> name.length() > 4;
          Function<String, Integer> nameLength = String::length;
          Consumer<String> printUpper = name -> System.out.println(name.toUpperCase());
          
          names.stream()
               .filter(isLongName)
               .map(nameLength)
               .forEach(length -> System.out.println("Length: " + length));
      }
  }
  ```

- **Streams API for data processing:**
  - Creating streams
  - Intermediate and terminal operations
  - Parallel streams
  
  ```java
  // Example: Streams API
  import java.util.*;
  import java.util.stream.*;
  
  public class StreamsDemo {
      public static void main(String[] args) {
          List<Employee> employees = Arrays.asList(
              new Employee("Alice", "Engineering", 75000),
              new Employee("Bob", "HR", 65000),
              new Employee("Charlie", "Engineering", 80000),
              new Employee("Diana", "Sales", 70000),
              new Employee("Eve", "Engineering", 72000)
          );
          
          // Filter, map, and collect
          List<String> engineeringNames = employees.stream()
              .filter(emp -> "Engineering".equals(emp.getDepartment()))
              .map(Employee::getName)
              .collect(Collectors.toList());
          
          System.out.println("Engineering employees: " + engineeringNames);
          
          // Calculate average salary by department
          Map<String, Double> avgSalaryByDept = employees.stream()
              .collect(Collectors.groupingBy(
                  Employee::getDepartment,
                  Collectors.averagingDouble(Employee::getSalary)
              ));
          
          System.out.println("Average salary by department: " + avgSalaryByDept);
          
          // Parallel stream for large datasets
          List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
          int sum = numbers.parallelStream()
                          .filter(n -> n % 2 == 0)
                          .mapToInt(Integer::intValue)
                          .sum();
          
          System.out.println("Sum of even numbers: " + sum);
          
          // Stream operations chaining
          Optional<Employee> highestPaid = employees.stream()
              .max(Comparator.comparingDouble(Employee::getSalary));
          
          highestPaid.ifPresent(emp -> 
              System.out.println("Highest paid: " + emp.getName() + " ($" + emp.getSalary() + ")")
          );
      }
  }
  
  class Employee {
      private String name;
      private String department;
      private double salary;
      
      public Employee(String name, String department, double salary) {
          this.name = name;
          this.department = department;
          this.salary = salary;
      }
      
      // Getters
      public String getName() { return name; }
      public String getDepartment() { return department; }
      public double getSalary() { return salary; }
  }
  ```

### File Handling and I/O Operations
- **Reading and writing files with NIO.2:**
  - Path, Paths, and Files classes
  - Reading and writing text/binary files
  - File operations (create, delete, copy, move)
  
  ```java
  // Example: File handling with NIO.2
  import java.nio.file.*;
  import java.io.*;
  import java.util.*;
  
  public class FileHandlingDemo {
      public static void main(String[] args) {
          Path filePath = Paths.get("sample.txt");
          Path dirPath = Paths.get("data");
          
          try {
              // Create directory if it doesn't exist
              if (!Files.exists(dirPath)) {
                  Files.createDirectory(dirPath);
                  System.out.println("Created directory: " + dirPath);
              }
              
              // Write to file
              List<String> lines = Arrays.asList(
                  "Line 1: Hello World",
                  "Line 2: Java File I/O",
                  "Line 3: NIO.2 is powerful"
              );
              
              Files.write(filePath, lines, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
              System.out.println("Written to file: " + filePath);
              
              // Read from file
              List<String> readLines = Files.readAllLines(filePath);
              System.out.println("Read from file:");
              readLines.forEach(System.out::println);
              
              // File operations
              Path copyPath = Paths.get("sample_copy.txt");
              Files.copy(filePath, copyPath, StandardCopyOption.REPLACE_EXISTING);
              System.out.println("File copied to: " + copyPath);
              
              // List directory contents
              try (DirectoryStream<Path> stream = Files.newDirectoryStream(Paths.get("."))) {
                  System.out.println("Current directory contents:");
                  for (Path entry : stream) {
                      System.out.println("- " + entry.getFileName());
                  }
              }
              
              // File attributes
              BasicFileAttributes attrs = Files.readAttributes(filePath, BasicFileAttributes.class);
              System.out.println("File size: " + attrs.size() + " bytes");
              System.out.println("Created: " + attrs.creationTime());
              System.out.println("Modified: " + attrs.lastModifiedTime());
              
          } catch (IOException e) {
              System.err.println("Error: " + e.getMessage());
          }
      }
  }
  ```

- **Memory-mapped files for performance:**
  - Memory-mapped I/O
  - Random access to large files
  - Performance benefits
  
  ```java
  // Example: Memory-mapped files
  import java.nio.*;
  import java.nio.channels.*;
  import java.nio.file.*;
  import java.io.*;
  
  public class MemoryMappedFileDemo {
      public static void main(String[] args) {
          Path filePath = Paths.get("large_file.txt");
          
          try {
              // Create a large file for demonstration
              try (BufferedWriter writer = Files.newBufferedWriter(filePath)) {
                  for (int i = 0; i < 10000; i++) {
                      writer.write("Line " + i + ": This is a test line with some data\n");
                  }
              }
              
              // Memory-map the file for reading
              try (FileChannel fileChannel = FileChannel.open(filePath, StandardOpenOption.READ)) {
                  MappedByteBuffer buffer = fileChannel.map(FileChannel.MapMode.READ_ONLY, 0, fileChannel.size());
                  
                  // Read data from memory-mapped buffer
                  StringBuilder content = new StringBuilder();
                  while (buffer.hasRemaining()) {
                      content.append((char) buffer.get());
                  }
                  
                  System.out.println("First 200 characters:");
                  System.out.println(content.substring(0, Math.min(200, content.length())));
                  
                  // Random access - jump to specific position
                  buffer.position(1000);  // Skip to position 1000
                  StringBuilder randomContent = new StringBuilder();
                  for (int i = 0; i < 100; i++) {
                      if (buffer.hasRemaining()) {
                          randomContent.append((char) buffer.get());
                      }
                  }
                  
                  System.out.println("\nContent from position 1000:");
                  System.out.println(randomContent.toString());
              }
              
              // Memory-map for writing
              try (FileChannel fileChannel = FileChannel.open(filePath, StandardOpenOption.READ, StandardOpenOption.WRITE)) {
                  MappedByteBuffer buffer = fileChannel.map(FileChannel.MapMode.READ_WRITE, 0, fileChannel.size());
                  
                  // Modify content at specific position
                  buffer.position(10);
                  buffer.put("MODIFIED".getBytes());
                  
                  System.out.println("Modified content at position 10");
              }
              
          } catch (IOException e) {
              System.err.println("Error: " + e.getMessage());
          }
      }
  }
  ```

### Multithreading and Concurrency
- **Creating and managing threads:**
  - Thread class and Runnable interface
  - Thread lifecycle and states
  - Thread synchronization
  
  ```java
  // Example: Basic threading
  public class ThreadingDemo {
      public static void main(String[] args) {
          // Method 1: Extend Thread class
          Thread thread1 = new MyThread("Thread-1");
          thread1.start();
          
          // Method 2: Implement Runnable
          Thread thread2 = new Thread(new MyRunnable(), "Thread-2");
          thread2.start();
          
          // Method 3: Lambda expression
          Thread thread3 = new Thread(() -> {
              for (int i = 0; i < 5; i++) {
                  System.out.println(Thread.currentThread().getName() + " - Count: " + i);
                  try {
                      Thread.sleep(100);
                  } catch (InterruptedException e) {
                      Thread.currentThread().interrupt();
                  }
              }
          }, "Thread-3");
          thread3.start();
          
          // Wait for threads to complete
          try {
              thread1.join();
              thread2.join();
              thread3.join();
          } catch (InterruptedException e) {
              Thread.currentThread().interrupt();
          }
          
          System.out.println("All threads completed");
      }
  }
  
  class MyThread extends Thread {
      public MyThread(String name) {
          super(name);
      }
      
      @Override
      public void run() {
          for (int i = 0; i < 5; i++) {
              System.out.println(getName() + " - Count: " + i);
              try {
                  Thread.sleep(100);
              } catch (InterruptedException e) {
                  interrupt();
              }
          }
      }
  }
  
  class MyRunnable implements Runnable {
      @Override
      public void run() {
          for (int i = 0; i < 5; i++) {
              System.out.println(Thread.currentThread().getName() + " - Count: " + i);
              try {
                  Thread.sleep(100);
              } catch (InterruptedException e) {
                  Thread.currentThread().interrupt();
              }
          }
      }
  }
  ```

- **Synchronization and thread safety:**
  - Synchronized methods and blocks
  - Volatile variables
  - Atomic operations
  
  ```java
  // Example: Synchronization
  public class SynchronizationDemo {
      public static void main(String[] args) {
          SharedCounter counter = new SharedCounter();
          
          Thread thread1 = new Thread(() -> {
              for (int i = 0; i < 1000; i++) {
                  counter.increment();
              }
          }, "Increment-Thread");
          
          Thread thread2 = new Thread(() -> {
              for (int i = 0; i < 1000; i++) {
                  counter.increment();
              }
          }, "Increment-Thread-2");
          
          thread1.start();
          thread2.start();
          
          try {
              thread1.join();
              thread2.join();
          } catch (InterruptedException e) {
              Thread.currentThread().interrupt();
          }
          
          System.out.println("Final count: " + counter.getCount());  // Should be 2000
      }
  }
  
  class SharedCounter {
      private int count = 0;
      
      // Synchronized method
      public synchronized void increment() {
          count++;
      }
      
      public synchronized int getCount() {
          return count;
      }
  }
  
  // Atomic operations
  import java.util.concurrent.atomic.*;
  
  class AtomicCounter {
      private AtomicInteger count = new AtomicInteger(0);
      
      public void increment() {
          count.incrementAndGet();
      }
      
      public int getCount() {
          return count.get();
      }
  }
  
  // Volatile example
  class VolatileExample {
      private volatile boolean flag = false;
      
      public void setFlag(boolean flag) {
          this.flag = flag;
      }
      
      public boolean getFlag() {
          return flag;
      }
  }
  ```

- **Executor framework and thread pools:**
  - ExecutorService and Executors
  - Callable and Future
  - Thread pool management
  
  ```java
  // Example: Executor framework
  import java.util.concurrent.*;
  import java.util.*;
  
  public class ExecutorDemo {
      public static void main(String[] args) {
          // Create thread pool
          ExecutorService executor = Executors.newFixedThreadPool(3);
          
          // Submit Runnable tasks
          for (int i = 0; i < 5; i++) {
              final int taskId = i;
              executor.submit(() -> {
                  System.out.println("Task " + taskId + " executed by " + Thread.currentThread().getName());
                  try {
                      Thread.sleep(1000);
                  } catch (InterruptedException e) {
                      Thread.currentThread().interrupt();
                  }
              });
          }
          
          // Submit Callable tasks
          List<Future<Integer>> futures = new ArrayList<>();
          for (int i = 0; i < 5; i++) {
              final int number = i;
              Future<Integer> future = executor.submit(() -> {
                  Thread.sleep(500);
                  return number * number;
              });
              futures.add(future);
          }
          
          // Get results
          for (int i = 0; i < futures.size(); i++) {
              try {
                  Integer result = futures.get(i).get();
                  System.out.println("Result of task " + i + ": " + result);
              } catch (InterruptedException | ExecutionException e) {
                  System.err.println("Error getting result: " + e.getMessage());
              }
          }
          
          // Shutdown executor
          executor.shutdown();
          try {
              if (!executor.awaitTermination(5, TimeUnit.SECONDS)) {
                  executor.shutdownNow();
              }
          } catch (InterruptedException e) {
              executor.shutdownNow();
              Thread.currentThread().interrupt();
          }
          
          System.out.println("All tasks completed");
      }
  }
  ```

### Advanced Concurrency
- **Concurrent collections:**
  - ConcurrentHashMap, CopyOnWriteArrayList
  - BlockingQueue implementations
  - Thread-safe data structures
  
  ```java
  // Example: Concurrent collections
  import java.util.concurrent.*;
  import java.util.*;
  
  public class ConcurrentCollectionsDemo {
      public static void main(String[] args) {
          // ConcurrentHashMap
          ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
          
          // Multiple threads updating the map
          ExecutorService executor = Executors.newFixedThreadPool(3);
          
          for (int i = 0; i < 3; i++) {
              final int threadId = i;
              executor.submit(() -> {
                  for (int j = 0; j < 10; j++) {
                      String key = "Key-" + threadId + "-" + j;
                      map.put(key, threadId * 10 + j);
                  }
              });
          }
          
          executor.shutdown();
          try {
              executor.awaitTermination(5, TimeUnit.SECONDS);
          } catch (InterruptedException e) {
              Thread.currentThread().interrupt();
          }
          
          System.out.println("Map size: " + map.size());
          
          // BlockingQueue
          BlockingQueue<String> queue = new LinkedBlockingQueue<>(10);
          
          // Producer
          Thread producer = new Thread(() -> {
              try {
                  for (int i = 0; i < 5; i++) {
                      String item = "Item-" + i;
                      queue.put(item);
                      System.out.println("Produced: " + item);
                      Thread.sleep(100);
                  }
              } catch (InterruptedException e) {
                  Thread.currentThread().interrupt();
              }
          });
          
          // Consumer
          Thread consumer = new Thread(() -> {
              try {
                  for (int i = 0; i < 5; i++) {
                      String item = queue.take();
                      System.out.println("Consumed: " + item);
                      Thread.sleep(200);
                  }
              } catch (InterruptedException e) {
                  Thread.currentThread().interrupt();
              }
          });
          
          producer.start();
          consumer.start();
          
          try {
              producer.join();
              consumer.join();
          } catch (InterruptedException e) {
              Thread.currentThread().interrupt();
          }
      }
  }
  ```

- **Locks and conditions:**
  - ReentrantLock and ReadWriteLock
  - Condition objects
  - Lock vs synchronized
  
  ```java
  // Example: Locks and conditions
  import java.util.concurrent.locks.*;
  
  public class LockDemo {
      private final Lock lock = new ReentrantLock();
      private final Condition condition = lock.newCondition();
      private boolean ready = false;
      
      public void produce() {
          lock.lock();
          try {
              System.out.println("Producer: Preparing data...");
              Thread.sleep(2000);
              ready = true;
              System.out.println("Producer: Data ready, notifying consumer");
              condition.signal();
          } catch (InterruptedException e) {
              Thread.currentThread().interrupt();
          } finally {
              lock.unlock();
          }
      }
      
      public void consume() {
          lock.lock();
          try {
              while (!ready) {
                  System.out.println("Consumer: Waiting for data...");
                  condition.await();
              }
              System.out.println("Consumer: Processing data...");
              Thread.sleep(1000);
              System.out.println("Consumer: Data processed");
          } catch (InterruptedException e) {
              Thread.currentThread().interrupt();
          } finally {
              lock.unlock();
          }
      }
      
      public static void main(String[] args) {
          LockDemo demo = new LockDemo();
          
          Thread producer = new Thread(demo::produce);
          Thread consumer = new Thread(demo::consume);
          
          consumer.start();
          producer.start();
          
          try {
              producer.join();
              consumer.join();
          } catch (InterruptedException e) {
              Thread.currentThread().interrupt();
          }
      }
  }
  ```

### Networking
- **Socket programming:**
  - TCP and UDP sockets
  - Client-server communication
  - Non-blocking I/O
  
  ```java
  // Example: TCP Socket programming
  import java.io.*;
  import java.net.*;
  
  // Simple Echo Server
  class EchoServer {
      public static void main(String[] args) {
          try (ServerSocket serverSocket = new ServerSocket(8080)) {
              System.out.println("Server started on port 8080");
              
              while (true) {
                  Socket clientSocket = serverSocket.accept();
                  System.out.println("Client connected: " + clientSocket.getInetAddress());
                  
                  // Handle client in a separate thread
                  new Thread(() -> handleClient(clientSocket)).start();
              }
          } catch (IOException e) {
              System.err.println("Server error: " + e.getMessage());
          }
      }
      
      private static void handleClient(Socket clientSocket) {
          try (
              BufferedReader in = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()));
              PrintWriter out = new PrintWriter(clientSocket.getOutputStream(), true)
          ) {
              String inputLine;
              while ((inputLine = in.readLine()) != null) {
                  System.out.println("Received: " + inputLine);
                  out.println("Echo: " + inputLine);
                  
                  if ("bye".equalsIgnoreCase(inputLine.trim())) {
                      break;
                  }
              }
          } catch (IOException e) {
              System.err.println("Client handling error: " + e.getMessage());
          } finally {
              try {
                  clientSocket.close();
              } catch (IOException e) {
                  System.err.println("Error closing socket: " + e.getMessage());
              }
          }
      }
  }
  
  // Simple Echo Client
  class EchoClient {
      public static void main(String[] args) {
          try (
              Socket socket = new Socket("localhost", 8080);
              PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
              BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
              BufferedReader stdIn = new BufferedReader(new InputStreamReader(System.in))
          ) {
              String userInput;
              System.out.println("Connected to server. Type 'bye' to exit.");
              
              while ((userInput = stdIn.readLine()) != null) {
                  out.println(userInput);
                  System.out.println("Server response: " + in.readLine());
                  
                  if ("bye".equalsIgnoreCase(userInput.trim())) {
                      break;
                  }
              }
          } catch (IOException e) {
              System.err.println("Client error: " + e.getMessage());
          }
      }
  }
  ```

- **HTTP connections and URL handling:**
  - HttpURLConnection
  - URL and URI classes
  - HTTP methods and status codes
  
  ```java
  // Example: HTTP connections
  import java.io.*;
  import java.net.*;
  
  public class HttpDemo {
      public static void main(String[] args) {
          // Simple GET request
          try {
              URL url = new URL("https://jsonplaceholder.typicode.com/posts/1");
              HttpURLConnection connection = (HttpURLConnection) url.openConnection();
              
              connection.setRequestMethod("GET");
              connection.setRequestProperty("Accept", "application/json");
              
              int responseCode = connection.getResponseCode();
              System.out.println("Response Code: " + responseCode);
              
              if (responseCode == HttpURLConnection.HTTP_OK) {
                  BufferedReader in = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                  String inputLine;
                  StringBuilder response = new StringBuilder();
                  
                  while ((inputLine = in.readLine()) != null) {
                      response.append(inputLine);
                  }
                  in.close();
                  
                  System.out.println("Response: " + response.toString());
              }
              
              connection.disconnect();
              
          } catch (IOException e) {
              System.err.println("HTTP request error: " + e.getMessage());
          }
          
          // POST request
          try {
              URL url = new URL("https://jsonplaceholder.typicode.com/posts");
              HttpURLConnection connection = (HttpURLConnection) url.openConnection();
              
              connection.setRequestMethod("POST");
              connection.setRequestProperty("Content-Type", "application/json");
              connection.setDoOutput(true);
              
              String jsonInputString = "{\"title\":\"foo\",\"body\":\"bar\",\"userId\":1}";
              
              try (OutputStream os = connection.getOutputStream()) {
                  byte[] input = jsonInputString.getBytes("utf-8");
                  os.write(input, 0, input);
              }
              
              int responseCode = connection.getResponseCode();
              System.out.println("POST Response Code: " + responseCode);
              
              if (responseCode == HttpURLConnection.HTTP_CREATED) {
                  try (BufferedReader br = new BufferedReader(
                          new InputStreamReader(connection.getInputStream(), "utf-8"))) {
                      StringBuilder response = new StringBuilder();
                      String responseLine;
                      while ((responseLine = br.readLine()) != null) {
                          response.append(responseLine.trim());
                      }
                      System.out.println("POST Response: " + response.toString());
                  }
              }
              
              connection.disconnect();
              
          } catch (IOException e) {
              System.err.println("POST request error: " + e.getMessage());
          }
      }
  }
  ```

### Advanced I/O and Serialization
- **Object serialization and deserialization:**
  - Serializable interface
  - transient keyword
  - Custom serialization
  
  ```java
  // Example: Object serialization
  import java.io.*;
  
  class Person implements Serializable {
      private static final long serialVersionUID = 1L;
      
      private String name;
      private int age;
      private transient String password;  // Won't be serialized
      
      public Person(String name, int age, String password) {
          this.name = name;
          this.age = age;
          this.password = password;
      }
      
      // Custom serialization
      private void writeObject(ObjectOutputStream oos) throws IOException {
          oos.defaultWriteObject();
          // Encrypt password before serialization
          oos.writeObject(encrypt(password));
      }
      
      private void readObject(ObjectInputStream ois) throws IOException, ClassNotFoundException {
          ois.defaultReadObject();
          // Decrypt password after deserialization
          password = decrypt((String) ois.readObject());
      }
      
      private String encrypt(String data) {
          return data != null ? "ENC:" + data : null;
      }
      
      private String decrypt(String data) {
          return data != null && data.startsWith("ENC:") ? data.substring(4) : data;
      }
      
      @Override
      public String toString() {
          return "Person{name='" + name + "', age=" + age + ", hasPassword=" + (password != null) + "}";
      }
  }
  
  public class SerializationDemo {
      public static void main(String[] args) {
          Person person = new Person("Alice", 30, "secret123");
          
          // Serialize
          try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream("person.ser"))) {
              oos.writeObject(person);
              System.out.println("Object serialized: " + person);
          } catch (IOException e) {
              System.err.println("Serialization error: " + e.getMessage());
          }
          
          // Deserialize
          try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream("person.ser"))) {
              Person deserializedPerson = (Person) ois.readObject();
              System.out.println("Object deserialized: " + deserializedPerson);
          } catch (IOException | ClassNotFoundException e) {
              System.err.println("Deserialization error: " + e.getMessage());
          }
      }
  }
  ```

- **NIO channels and buffers:**
  - ByteBuffer, CharBuffer, etc.
  - FileChannel for high-performance I/O
  - Non-blocking operations
  
  ```java
  // Example: NIO channels and buffers
  import java.nio.*;
  import java.nio.channels.*;
  import java.nio.file.*;
  import java.io.*;
  
  public class NIODemo {
      public static void main(String[] args) {
          Path filePath = Paths.get("nio_demo.txt");
          
          try {
              // Write using FileChannel and ByteBuffer
              try (FileChannel channel = FileChannel.open(filePath, 
                      StandardOpenOption.CREATE, StandardOpenOption.WRITE)) {
                  
                  String data = "Hello, NIO World!\nThis is a demonstration of Java NIO.";
                  ByteBuffer buffer = ByteBuffer.allocate(1024);
                  
                  buffer.put(data.getBytes());
                  buffer.flip();  // Prepare for reading
                  
                  while (buffer.hasRemaining()) {
                      channel.write(buffer);
                  }
                  
                  System.out.println("Data written using NIO");
              }
              
              // Read using FileChannel and ByteBuffer
              try (FileChannel channel = FileChannel.open(filePath, StandardOpenOption.READ)) {
                  ByteBuffer buffer = ByteBuffer.allocate(1024);
                  
                  int bytesRead = channel.read(buffer);
                  buffer.flip();
                  
                  byte[] bytes = new byte[bytesRead];
                  buffer.get(bytes);
                  
                  String content = new String(bytes);
                  System.out.println("Data read using NIO:");
                  System.out.println(content);
              }
              
              // Memory-mapped file with NIO
              try (FileChannel channel = FileChannel.open(filePath, StandardOpenOption.READ, StandardOpenOption.WRITE)) {
                  MappedByteBuffer mappedBuffer = channel.map(FileChannel.MapMode.READ_WRITE, 0, channel.size());
                  
                  // Modify content directly in memory
                  mappedBuffer.position(7);  // Position at "NIO"
                  mappedBuffer.put("New I/O".getBytes());
                  
                  System.out.println("Content modified using memory-mapped buffer");
              }
              
          } catch (IOException e) {
              System.err.println("NIO operation error: " + e.getMessage());
          }
      }
  }
  ```

## Project: Multithreaded File Processor
**Objective:** Create a multithreaded application that processes large files concurrently, demonstrating advanced Java concepts.

**Requirements:**
1. Use ExecutorService for thread management
2. Implement file reading with NIO.2
3. Process data concurrently using streams
4. Handle synchronization for shared resources
5. Include proper error handling and logging

**Example Implementation:**

```java
import java.nio.file.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.*;

public class MultithreadedFileProcessor {
    private final ExecutorService executor;
    private final ConcurrentHashMap<String, Integer> wordCount;
    
    public MultithreadedFileProcessor(int threadPoolSize) {
        this.executor = Executors.newFixedThreadPool(threadPoolSize);
        this.wordCount = new ConcurrentHashMap<>();
    }
    
    public void processFiles(Path directory) throws IOException {
        List<Path> files = Files.walk(directory)
                               .filter(Files::isRegularFile)
                               .filter(path -> path.toString().endsWith(".txt"))
                               .collect(Collectors.toList());
        
        System.out.println("Found " + files.size() + " text files to process");
        
        List<Future<Void>> futures = new ArrayList<>();
        
        for (Path file : files) {
            Future<Void> future = executor.submit(() -> {
                processFile(file);
                return null;
            });
            futures.add(future);
        }
        
        // Wait for all tasks to complete
        for (Future<Void> future : futures) {
            try {
                future.get();
            } catch (InterruptedException | ExecutionException e) {
                System.err.println("Error processing file: " + e.getMessage());
            }
        }
        
        // Display results
        displayResults();
    }
    
    private void processFile(Path filePath) {
        try {
            List<String> lines = Files.readAllLines(filePath);
            
            for (String line : lines) {
                String[] words = line.toLowerCase()
                                   .replaceAll("[^a-zA-Z\\s]", "")
                                   .split("\\s+");
                
                for (String word : words) {
                    if (!word.isEmpty()) {
                        wordCount.merge(word, 1, Integer::sum);
                    }
                }
            }
            
            System.out.println("Processed: " + filePath.getFileName());
            
        } catch (IOException e) {
            System.err.println("Error processing file " + filePath + ": " + e.getMessage());
        }
    }
    
    private void displayResults() {
        System.out.println("\n=== Word Count Results ===");
        
        wordCount.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(20)
                .forEach(entry -> 
                    System.out.println(entry.getKey() + ": " + entry.getValue())
                );
        
        System.out.println("Total unique words: " + wordCount.size());
    }
    
    public void shutdown() {
        executor.shutdown();
        try {
            if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
    
    public static void main(String[] args) {
        if (args.length != 1) {
            System.out.println("Usage: java MultithreadedFileProcessor <directory>");
            return;
        }
        
        Path directory = Paths.get(args[0]);
        MultithreadedFileProcessor processor = new MultithreadedFileProcessor(4);
        
        try {
            long startTime = System.currentTimeMillis();
            processor.processFiles(directory);
            long endTime = System.currentTimeMillis();
            
            System.out.println("Processing completed in " + (endTime - startTime) + " ms");
            
        } catch (IOException e) {
            System.err.println("Error: " + e.getMessage());
        } finally {
            processor.shutdown();
        }
    }
}
```

## Learning Outcomes
By the end of this module, students will be able to:
- Use lambda expressions and functional programming with the Streams API
- Perform efficient file I/O operations using NIO.2 and memory-mapped files
- Create and manage multithreaded applications with proper synchronization
- Implement client-server networking applications with sockets and HTTP
- Use advanced I/O patterns including serialization and NIO channels
- Build concurrent applications with thread pools and concurrent collections

## Resources
- "Java Concurrency in Practice" by Brian Goetz
- "Java NIO" by Ron Hitchens
- Oracle Java Documentation: https://docs.oracle.com/javase/tutorial/
- Baeldung Java Tutorials: https://www.baeldung.com/
- GitHub: Java concurrency examples and networking samples</content>
<parameter name="filePath">/Users/chhayhong/Desktop/spring-boot-course/pre-course-java-advanced.md