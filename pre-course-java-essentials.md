# Pre-Course Module: Java Essentials for Spring Boot

## Overview
This pre-course module provides a comprehensive refresher on Java programming fundamentals essential for Spring Boot development. It covers core Java concepts, object-oriented programming, advanced features, and build tools, with practical code examples to reinforce learning.

## Topics

### Java Fundamentals
- **Variables, data types, and operators:**
  - Primitive types: `int`, `double`, `boolean`, `char`
  - Reference types: `String`, arrays
  - Operators: arithmetic, comparison, logical
  
  ```java
  // Example: Variables and data types
  int age = 25;
  double salary = 50000.50;
  boolean isEmployed = true;
  String name = "John Doe";
  
  // Operators
  int sum = age + 5;  // 30
  boolean isAdult = age >= 18;  // true
  ```

- **Control structures: loops, conditionals, and switches:**
  - If-else statements for decision making
  - For, while, and do-while loops
  - Switch statements for multiple conditions
  
  ```java
  // Example: Control structures
  int score = 85;
  
  // If-else
  if (score >= 90) {
      System.out.println("Grade: A");
  } else if (score >= 80) {
      System.out.println("Grade: B");
  } else {
      System.out.println("Grade: C");
  }
  
  // For loop
  for (int i = 1; i <= 5; i++) {
      System.out.println("Count: " + i);
  }
  
  // Switch
  int day = 3;
  switch (day) {
      case 1: System.out.println("Monday"); break;
      case 2: System.out.println("Tuesday"); break;
      case 3: System.out.println("Wednesday"); break;
      default: System.out.println("Other day");
  }
  ```

- **Methods, parameters, and return types:**
  - Method declaration and invocation
  - Parameters: primitive and reference types
  - Return statements and void methods
  
  ```java
  // Example: Methods
  public class Calculator {
      // Method with parameters and return type
      public int add(int a, int b) {
          return a + b;
      }
      
      // Method with void return type
      public void printResult(int result) {
          System.out.println("Result: " + result);
      }
      
      // Method with reference parameter
      public void processName(String name) {
          System.out.println("Hello, " + name);
      }
  }
  
  // Usage
  Calculator calc = new Calculator();
  int sum = calc.add(5, 3);  // Returns 8
  calc.printResult(sum);     // Prints "Result: 8"
  calc.processName("Alice"); // Prints "Hello, Alice"
  ```

### Object-Oriented Programming (OOP)
- **Classes, objects, and constructors:**
  - Class definition and instantiation
  - Constructors: default and parameterized
  - Instance variables and methods
  
  ```java
  // Example: Classes and objects
  public class Person {
      // Instance variables
      private String name;
      private int age;
      
      // Default constructor
      public Person() {
          this.name = "Unknown";
          this.age = 0;
      }
      
      // Parameterized constructor
      public Person(String name, int age) {
          this.name = name;
          this.age = age;
      }
      
      // Methods
      public String getName() {
          return name;
      }
      
      public void setName(String name) {
          this.name = name;
      }
      
      public int getAge() {
          return age;
      }
      
      public void setAge(int age) {
          this.age = age;
      }
      
      public void displayInfo() {
          System.out.println("Name: " + name + ", Age: " + age);
      }
  }
  
  // Usage
  Person person1 = new Person();  // Uses default constructor
  Person person2 = new Person("Bob", 30);  // Uses parameterized constructor
  
  person1.setName("Alice");
  person1.setAge(25);
  person1.displayInfo();  // Name: Alice, Age: 25
  person2.displayInfo();  // Name: Bob, Age: 30
  ```

- **Inheritance, polymorphism, and encapsulation:**
  - Inheritance: extending classes
  - Polymorphism: method overriding and overloading
  - Encapsulation: data hiding with access modifiers
  
  ```java
  // Example: Inheritance and Polymorphism
  public class Animal {
      protected String name;
      
      public Animal(String name) {
          this.name = name;
      }
      
      public void makeSound() {
          System.out.println("Some sound");
      }
      
      public String getName() {
          return name;
      }
  }
  
  public class Dog extends Animal {
      private String breed;
      
      public Dog(String name, String breed) {
          super(name);  // Call parent constructor
          this.breed = breed;
      }
      
      // Method overriding (polymorphism)
      @Override
      public void makeSound() {
          System.out.println("Woof!");
      }
      
      // Method overloading (polymorphism)
      public void makeSound(int times) {
          for (int i = 0; i < times; i++) {
              System.out.println("Woof!");
          }
      }
      
      public String getBreed() {
          return breed;
      }
  }
  
  // Usage
  Animal animal = new Dog("Buddy", "Golden Retriever");
  animal.makeSound();  // Woof! (overridden method)
  
  Dog dog = (Dog) animal;  // Casting
  dog.makeSound(3);  // Woof! Woof! Woof! (overloaded method)
  ```

- **Access modifiers and packages:**
  - Public, private, protected, default access
  - Package organization and imports
  
  ```java
  // Example: Access modifiers and packages
  package com.example.vehicles;
  
  public class Vehicle {
      public String model;        // Accessible everywhere
      private int year;           // Accessible only within this class
      protected String color;     // Accessible in same package and subclasses
      double price;               // Default: accessible in same package
      
      public Vehicle(String model, int year, String color, double price) {
          this.model = model;
          this.year = year;
          this.color = color;
          this.price = price;
      }
      
      public int getYear() {
          return year;  // Private field accessed via public method
      }
      
      private void service() {  // Private method
          System.out.println("Servicing vehicle");
      }
      
      public void performService() {
          service();  // Call private method from within class
      }
  }
  
  // In another file/package
  package com.example.cars;
  import com.example.vehicles.Vehicle;
  
  public class Car extends Vehicle {
      private int doors;
      
      public Car(String model, int year, String color, double price, int doors) {
          super(model, year, color, price);
          this.doors = doors;
      }
      
      public void displayInfo() {
          System.out.println("Model: " + model);      // public
          System.out.println("Color: " + color);      // protected
          System.out.println("Year: " + getYear());   // via public method
          System.out.println("Doors: " + doors);
      }
  }
  ```

### Advanced Java Concepts
- **Interfaces and abstract classes:**
  - Defining contracts with interfaces
  - Abstract classes for partial implementation
  - Multiple interface implementation
  
  ```java
  // Example: Interfaces and abstract classes
  // Interface
  public interface Shape {
      double calculateArea();
      double calculatePerimeter();
  }
  
  // Abstract class
  public abstract class Polygon implements Shape {
      protected int sides;
      
      public Polygon(int sides) {
          this.sides = sides;
      }
      
      // Abstract method (must be implemented by subclasses)
      public abstract double calculateArea();
      
      // Concrete method
      public int getSides() {
          return sides;
      }
  }
  
  // Concrete class implementing interface through abstract class
  public class Rectangle extends Polygon {
      private double width;
      private double height;
      
      public Rectangle(double width, double height) {
          super(4);
          this.width = width;
          this.height = height;
      }
      
      @Override
      public double calculateArea() {
          return width * height;
      }
      
      @Override
      public double calculatePerimeter() {
          return 2 * (width + height);
      }
  }
  
  // Usage
  Shape rect = new Rectangle(5.0, 3.0);
  System.out.println("Area: " + rect.calculateArea());        // 15.0
  System.out.println("Perimeter: " + rect.calculatePerimeter()); // 16.0
  ```

- **Generics and type safety:**
  - Generic classes and methods
  - Type parameters and wildcards
  - Benefits for compile-time type checking
  
  ```java
  // Example: Generics
  public class Box<T> {
      private T item;
      
      public void setItem(T item) {
          this.item = item;
      }
      
      public T getItem() {
          return item;
      }
      
      public boolean isEmpty() {
          return item == null;
      }
  }
  
  // Generic method
  public class Utility {
      public static <T> void printArray(T[] array) {
          for (T element : array) {
              System.out.print(element + " ");
          }
          System.out.println();
      }
      
      // Bounded type parameter
      public static <T extends Number> double sum(T[] numbers) {
          double total = 0.0;
          for (T num : numbers) {
              total += num.doubleValue();
          }
          return total;
      }
  }
  
  // Usage
  Box<String> stringBox = new Box<>();
  stringBox.setItem("Hello");
  System.out.println(stringBox.getItem());  // Hello
  
  Box<Integer> intBox = new Box<>();
  intBox.setItem(42);
  System.out.println(intBox.getItem());     // 42
  
  String[] words = {"Java", "Generics", "Rock"};
  Utility.printArray(words);  // Java Generics Rock
  
  Integer[] numbers = {1, 2, 3, 4, 5};
  System.out.println("Sum: " + Utility.sum(numbers));  // Sum: 15.0
  ```

- **Collections Framework: Lists, Sets, Maps, and their implementations:**
  - List: ArrayList, LinkedList
  - Set: HashSet, TreeSet
  - Map: HashMap, TreeMap
  
  ```java
  // Example: Collections Framework
  import java.util.*;
  
  public class CollectionsDemo {
      public static void main(String[] args) {
          // List - ArrayList
          List<String> names = new ArrayList<>();
          names.add("Alice");
          names.add("Bob");
          names.add("Charlie");
          names.add(1, "David");  // Insert at index 1
          
          System.out.println("Names: " + names);  // [Alice, David, Bob, Charlie]
          System.out.println("Size: " + names.size());  // 4
          
          // Set - HashSet (no duplicates)
          Set<String> uniqueNames = new HashSet<>();
          uniqueNames.add("Alice");
          uniqueNames.add("Bob");
          uniqueNames.add("Alice");  // Duplicate, won't be added
          
          System.out.println("Unique names: " + uniqueNames);  // [Alice, Bob]
          
          // Map - HashMap
          Map<String, Integer> ageMap = new HashMap<>();
          ageMap.put("Alice", 25);
          ageMap.put("Bob", 30);
          ageMap.put("Charlie", 35);
          
          System.out.println("Alice's age: " + ageMap.get("Alice"));  // 25
          System.out.println("All ages: " + ageMap);  // {Alice=25, Bob=30, Charlie=35}
          
          // Iterating over collections
          System.out.println("All names:");
          for (String name : names) {
              System.out.println("- " + name);
          }
          
          System.out.println("All ages:");
          for (Map.Entry<String, Integer> entry : ageMap.entrySet()) {
              System.out.println("- " + entry.getKey() + ": " + entry.getValue());
          }
      }
  }
  ```

- **Exception handling: try-catch, throws, and custom exceptions:**
  - Checked vs unchecked exceptions
  - Try-catch-finally blocks
  - Creating custom exception classes
  
  ```java
  // Example: Exception handling
  import java.io.*;
  
  // Custom exception
  class InvalidAgeException extends Exception {
      public InvalidAgeException(String message) {
          super(message);
      }
  }
  
  public class ExceptionDemo {
      // Method that throws checked exception
      public static void readFile(String filename) throws IOException {
          BufferedReader reader = new BufferedReader(new FileReader(filename));
          String line = reader.readLine();
          System.out.println("File content: " + line);
          reader.close();
      }
      
      // Method with custom exception
      public static void validateAge(int age) throws InvalidAgeException {
          if (age < 0 || age > 150) {
              throw new InvalidAgeException("Age must be between 0 and 150");
          }
          System.out.println("Valid age: " + age);
      }
      
      public static void main(String[] args) {
          // Try-catch-finally
          try {
              // This might throw IOException
              readFile("nonexistent.txt");
          } catch (IOException e) {
              System.out.println("File error: " + e.getMessage());
          } finally {
              System.out.println("This always executes");
          }
          
          // Custom exception
          try {
              validateAge(25);      // Valid
              validateAge(-5);      // Throws exception
          } catch (InvalidAgeException e) {
              System.out.println("Validation error: " + e.getMessage());
          }
          
          // Unchecked exception
          try {
              int result = 10 / 0;  // ArithmeticException
          } catch (ArithmeticException e) {
              System.out.println("Math error: " + e.getMessage());
          }
      }
  }
  ```

### Popular Design Patterns
- **Creational patterns: Singleton, Factory, Builder:**
  - Singleton: Ensures only one instance exists
  - Factory: Creates objects without specifying exact classes
  - Builder: Constructs complex objects step by step
  
  ```java
  // Singleton Pattern
  public class DatabaseConnection {
      private static DatabaseConnection instance;
      
      private DatabaseConnection() {
          // Private constructor
      }
      
      public static DatabaseConnection getInstance() {
          if (instance == null) {
              instance = new DatabaseConnection();
          }
          return instance;
      }
      
      public void connect() {
          System.out.println("Connected to database");
      }
  }
  
  // Factory Pattern
  interface Shape {
      void draw();
  }
  
  class Circle implements Shape {
      @Override
      public void draw() {
          System.out.println("Drawing a circle");
      }
  }
  
  class Rectangle implements Shape {
      @Override
      public void draw() {
          System.out.println("Drawing a rectangle");
      }
  }
  
  class ShapeFactory {
      public Shape createShape(String type) {
          switch (type.toLowerCase()) {
              case "circle": return new Circle();
              case "rectangle": return new Rectangle();
              default: throw new IllegalArgumentException("Unknown shape type");
          }
      }
  }
  
  // Builder Pattern
  class Computer {
      private String cpu;
      private String ram;
      private String storage;
      private String gpu;
      
      private Computer(Builder builder) {
          this.cpu = builder.cpu;
          this.ram = builder.ram;
          this.storage = builder.storage;
          this.gpu = builder.gpu;
      }
      
      public static class Builder {
          private String cpu;
          private String ram;
          private String storage;
          private String gpu;
          
          public Builder cpu(String cpu) {
              this.cpu = cpu;
              return this;
          }
          
          public Builder ram(String ram) {
              this.ram = ram;
              return this;
          }
          
          public Builder storage(String storage) {
              this.storage = storage;
              return this;
          }
          
          public Builder gpu(String gpu) {
              this.gpu = gpu;
              return this;
          }
          
          public Computer build() {
              return new Computer(this);
          }
      }
      
      @Override
      public String toString() {
          return "Computer [CPU=" + cpu + ", RAM=" + ram + ", Storage=" + storage + ", GPU=" + gpu + "]";
      }
  }
  
  // Usage
  public class DesignPatternsDemo {
      public static void main(String[] args) {
          // Singleton
          DatabaseConnection db1 = DatabaseConnection.getInstance();
          DatabaseConnection db2 = DatabaseConnection.getInstance();
          System.out.println("Same instance: " + (db1 == db2));  // true
          db1.connect();
          
          // Factory
          ShapeFactory factory = new ShapeFactory();
          Shape circle = factory.createShape("circle");
          Shape rectangle = factory.createShape("rectangle");
          circle.draw();     // Drawing a circle
          rectangle.draw();  // Drawing a rectangle
          
          // Builder
          Computer computer = new Computer.Builder()
              .cpu("Intel i7")
              .ram("16GB")
              .storage("512GB SSD")
              .gpu("NVIDIA RTX 3080")
              .build();
          
          System.out.println(computer);
      }
  }
  ```

- **Structural patterns: Adapter, Decorator, Composite:**
  - Adapter: Allows incompatible interfaces to work together
  - Decorator: Adds behavior to objects dynamically
  - Composite: Treats individual objects and compositions uniformly
  
  ```java
  // Adapter Pattern
  interface MediaPlayer {
      void play(String audioType, String fileName);
  }
  
  interface AdvancedMediaPlayer {
      void playVlc(String fileName);
      void playMp4(String fileName);
  }
  
  class VlcPlayer implements AdvancedMediaPlayer {
      @Override
      public void playVlc(String fileName) {
          System.out.println("Playing vlc file: " + fileName);
      }
      
      @Override
      public void playMp4(String fileName) {
          // Do nothing
      }
  }
  
  class Mp4Player implements AdvancedMediaPlayer {
      @Override
      public void playVlc(String fileName) {
          // Do nothing
      }
      
      @Override
      public void playMp4(String fileName) {
          System.out.println("Playing mp4 file: " + fileName);
      }
  }
  
  class MediaAdapter implements MediaPlayer {
      AdvancedMediaPlayer advancedPlayer;
      
      public MediaAdapter(String audioType) {
          if (audioType.equalsIgnoreCase("vlc")) {
              advancedPlayer = new VlcPlayer();
          } else if (audioType.equalsIgnoreCase("mp4")) {
              advancedPlayer = new Mp4Player();
          }
      }
      
      @Override
      public void play(String audioType, String fileName) {
          if (audioType.equalsIgnoreCase("vlc")) {
              advancedPlayer.playVlc(fileName);
          } else if (audioType.equalsIgnoreCase("mp4")) {
              advancedPlayer.playMp4(fileName);
          }
      }
  }
  
  class AudioPlayer implements MediaPlayer {
      MediaAdapter mediaAdapter;
      
      @Override
      public void play(String audioType, String fileName) {
          if (audioType.equalsIgnoreCase("mp3")) {
              System.out.println("Playing mp3 file: " + fileName);
          } else if (audioType.equalsIgnoreCase("vlc") || audioType.equalsIgnoreCase("mp4")) {
              mediaAdapter = new MediaAdapter(audioType);
              mediaAdapter.play(audioType, fileName);
          } else {
              System.out.println("Invalid media type: " + audioType);
          }
      }
  }
  
  // Decorator Pattern
  interface Coffee {
      double getCost();
      String getDescription();
  }
  
  class SimpleCoffee implements Coffee {
      @Override
      public double getCost() {
          return 2.0;
      }
      
      @Override
      public String getDescription() {
          return "Simple coffee";
      }
  }
  
  abstract class CoffeeDecorator implements Coffee {
      protected Coffee decoratedCoffee;
      
      public CoffeeDecorator(Coffee coffee) {
          this.decoratedCoffee = coffee;
      }
      
      @Override
      public double getCost() {
          return decoratedCoffee.getCost();
      }
      
      @Override
      public String getDescription() {
          return decoratedCoffee.getDescription();
      }
  }
  
  class MilkDecorator extends CoffeeDecorator {
      public MilkDecorator(Coffee coffee) {
          super(coffee);
      }
      
      @Override
      public double getCost() {
          return super.getCost() + 0.5;
      }
      
      @Override
      public String getDescription() {
          return super.getDescription() + ", milk";
      }
  }
  
  class SugarDecorator extends CoffeeDecorator {
      public SugarDecorator(Coffee coffee) {
          super(coffee);
      }
      
      @Override
      public double getCost() {
          return super.getCost() + 0.2;
      }
      
      @Override
      public String getDescription() {
          return super.getDescription() + ", sugar";
      }
  }
  
  // Composite Pattern
  interface Employee {
      void showDetails();
      double getSalary();
  }
  
  class Developer implements Employee {
      private String name;
      private double salary;
      
      public Developer(String name, double salary) {
          this.name = name;
          this.salary = salary;
      }
      
      @Override
      public void showDetails() {
          System.out.println("Developer: " + name + ", Salary: $" + salary);
      }
      
      @Override
      public double getSalary() {
          return salary;
      }
  }
  
  class Manager implements Employee {
      private String name;
      private double salary;
      private List<Employee> subordinates;
      
      public Manager(String name, double salary) {
          this.name = name;
          this.salary = salary;
          this.subordinates = new ArrayList<>();
      }
      
      public void addSubordinate(Employee employee) {
          subordinates.add(employee);
      }
      
      public void removeSubordinate(Employee employee) {
          subordinates.remove(employee);
      }
      
      @Override
      public void showDetails() {
          System.out.println("Manager: " + name + ", Salary: $" + salary);
          System.out.println("Subordinates:");
          for (Employee emp : subordinates) {
              emp.showDetails();
          }
      }
      
      @Override
      public double getSalary() {
          double total = salary;
          for (Employee emp : subordinates) {
              total += emp.getSalary();
          }
          return total;
      }
  }
  
  // Usage
  public class StructuralPatternsDemo {
      public static void main(String[] args) {
          // Adapter
          AudioPlayer audioPlayer = new AudioPlayer();
          audioPlayer.play("mp3", "song.mp3");
          audioPlayer.play("mp4", "movie.mp4");
          audioPlayer.play("vlc", "video.vlc");
          
          // Decorator
          Coffee coffee = new SimpleCoffee();
          System.out.println(coffee.getDescription() + " $" + coffee.getCost());
          
          coffee = new MilkDecorator(coffee);
          System.out.println(coffee.getDescription() + " $" + coffee.getCost());
          
          coffee = new SugarDecorator(coffee);
          System.out.println(coffee.getDescription() + " $" + coffee.getCost());
          
          // Composite
          Developer dev1 = new Developer("John", 50000);
          Developer dev2 = new Developer("Jane", 55000);
          
          Manager manager = new Manager("Boss", 80000);
          manager.addSubordinate(dev1);
          manager.addSubordinate(dev2);
          
          manager.showDetails();
          System.out.println("Total team salary: $" + manager.getSalary());
      }
  }
  ```

- **Behavioral patterns: Observer, Strategy, Command:**
  - Observer: Defines one-to-many dependency between objects
  - Strategy: Encapsulates algorithms and makes them interchangeable
  - Command: Encapsulates requests as objects
  
  ```java
  // Observer Pattern
  import java.util.*;
  
  interface Observer {
      void update(String message);
  }
  
  interface Subject {
      void attach(Observer observer);
      void detach(Observer observer);
      void notifyObservers();
  }
  
  class NewsAgency implements Subject {
      private List<Observer> observers = new ArrayList<>();
      private String news;
      
      @Override
      public void attach(Observer observer) {
          observers.add(observer);
      }
      
      @Override
      public void detach(Observer observer) {
          observers.remove(observer);
      }
      
      @Override
      public void notifyObservers() {
          for (Observer observer : observers) {
              observer.update(news);
          }
      }
      
      public void setNews(String news) {
          this.news = news;
          notifyObservers();
      }
  }
  
  class NewsChannel implements Observer {
      private String name;
      
      public NewsChannel(String name) {
          this.name = name;
      }
      
      @Override
      public void update(String news) {
          System.out.println(name + " received news: " + news);
      }
  }
  
  // Strategy Pattern
  interface PaymentStrategy {
      void pay(double amount);
  }
  
  class CreditCardPayment implements PaymentStrategy {
      private String cardNumber;
      
      public CreditCardPayment(String cardNumber) {
          this.cardNumber = cardNumber;
      }
      
      @Override
      public void pay(double amount) {
          System.out.println("Paid $" + amount + " using credit card " + cardNumber);
      }
  }
  
  class PayPalPayment implements PaymentStrategy {
      private String email;
      
      public PayPalPayment(String email) {
          this.email = email;
      }
      
      @Override
      public void pay(double amount) {
          System.out.println("Paid $" + amount + " using PayPal account " + email);
      }
  }
  
  class ShoppingCart {
      private List<Double> items = new ArrayList<>();
      private PaymentStrategy paymentStrategy;
      
      public void addItem(double price) {
          items.add(price);
      }
      
      public void setPaymentStrategy(PaymentStrategy strategy) {
          this.paymentStrategy = strategy;
      }
      
      public void checkout() {
          double total = items.stream().mapToDouble(Double::doubleValue).sum();
          paymentStrategy.pay(total);
      }
  }
  
  // Command Pattern
  interface Command {
      void execute();
      void undo();
  }
  
  class Light {
      public void turnOn() {
          System.out.println("Light is on");
      }
      
      public void turnOff() {
          System.out.println("Light is off");
      }
  }
  
  class LightOnCommand implements Command {
      private Light light;
      
      public LightOnCommand(Light light) {
          this.light = light;
      }
      
      @Override
      public void execute() {
          light.turnOn();
      }
      
      @Override
      public void undo() {
          light.turnOff();
      }
  }
  
  class LightOffCommand implements Command {
      private Light light;
      
      public LightOffCommand(Light light) {
          this.light = light;
      }
      
      @Override
      public void execute() {
          light.turnOff();
      }
      
      @Override
      public void undo() {
          light.turnOn();
      }
  }
  
  class RemoteControl {
      private Command command;
      
      public void setCommand(Command command) {
          this.command = command;
      }
      
      public void pressButton() {
          command.execute();
      }
      
      public void pressUndo() {
          command.undo();
      }
  }
  
  // Usage
  public class BehavioralPatternsDemo {
      public static void main(String[] args) {
          // Observer
          NewsAgency agency = new NewsAgency();
          NewsChannel channel1 = new NewsChannel("CNN");
          NewsChannel channel2 = new NewsChannel("BBC");
          
          agency.attach(channel1);
          agency.attach(channel2);
          
          agency.setNews("Breaking news!");
          
          // Strategy
          ShoppingCart cart = new ShoppingCart();
          cart.addItem(10.0);
          cart.addItem(20.0);
          
          cart.setPaymentStrategy(new CreditCardPayment("1234-5678-9012-3456"));
          cart.checkout();
          
          cart.setPaymentStrategy(new PayPalPayment("user@example.com"));
          cart.checkout();
          
          // Command
          Light light = new Light();
          Command lightOn = new LightOnCommand(light);
          Command lightOff = new LightOffCommand(light);
          
          RemoteControl remote = new RemoteControl();
          
          remote.setCommand(lightOn);
          remote.pressButton();
          
          remote.setCommand(lightOff);
          remote.pressButton();
          
          remote.pressUndo();  // Undo last command
      }
  }
  ```

## Java Annotations and Build Tools
- **Introduction to annotations and their usage:**
  - Built-in annotations: @Override, @Deprecated, @SuppressWarnings
  - Creating custom annotations
  
  ```java
  // Example: Annotations
  import java.lang.annotation.*;
  
  // Custom annotation
  @Retention(RetentionPolicy.RUNTIME)
  @Target(ElementType.METHOD)
  public @interface Test {
      String description() default "";
  }
  
  // Using annotations
  public class AnnotationDemo {
      @Override
      public String toString() {
          return "AnnotationDemo instance";
      }
      
      @Deprecated
      public void oldMethod() {
          System.out.println("This method is deprecated");
      }
      
      @SuppressWarnings("unchecked")
      public void suppressWarning() {
          // Some code that generates warnings
      }
      
      @Test(description = "A test method")
      public void testMethod() {
          System.out.println("Running test");
      }
  }
  ```

- **Basics of reflection:**
  - Inspecting classes at runtime
  - Accessing fields and methods dynamically
  
  ```java
  // Example: Reflection
  import java.lang.reflect.*;
  
  public class ReflectionDemo {
      public static void main(String[] args) {
          try {
              // Get Class object
              Class<?> clazz = String.class;
              
              // Get methods
              Method[] methods = clazz.getMethods();
              System.out.println("String methods:");
              for (Method method : methods) {
                  System.out.println("- " + method.getName());
              }
              
              // Create instance and invoke method
              String str = (String) clazz.getConstructor(String.class).newInstance("Hello");
              Method lengthMethod = clazz.getMethod("length");
              int length = (Integer) lengthMethod.invoke(str);
              System.out.println("Length of '" + str + "': " + length);
              
          } catch (Exception e) {
              e.printStackTrace();
          }
      }
  }
  ```

- **Maven and Gradle: dependency management and project structure:**
  - Maven: pom.xml, lifecycle phases
  - Gradle: build.gradle, tasks
  
  ```xml
  <!-- Maven pom.xml example -->
  <?xml version="1.0" encoding="UTF-8"?>
  <project xmlns="http://maven.apache.org/POM/4.0.0"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
           http://maven.apache.org/xsd/maven-4.0.0.xsd">
      <modelVersion>4.0.0</modelVersion>
      
      <groupId>com.example</groupId>
      <artifactId>java-essentials</artifactId>
      <version>1.0.0</version>
      
      <properties>
          <maven.compiler.source>11</maven.compiler.source>
          <maven.compiler.target>11</maven.compiler.target>
      </properties>
      
      <dependencies>
          <dependency>
              <groupId>junit</groupId>
              <artifactId>junit</artifactId>
              <version>4.13.2</version>
              <scope>test</scope>
          </dependency>
      </dependencies>
  </project>
  ```

  ```gradle
  // Gradle build.gradle example
  plugins {
      id 'java'
  }
  
  group = 'com.example'
  version = '1.0.0'
  
  java {
      sourceCompatibility = '11'
      targetCompatibility = '11'
  }
  
  repositories {
      mavenCentral()
  }
  
  dependencies {
      testImplementation 'junit:junit:4.13.2'
  }
  
  // Custom task
  task hello {
      doLast {
          println 'Hello from Gradle!'
      }
  }
  ```

## Project: Java Application with OOP Concepts
**Objective:** Create a simple Java application that demonstrates object-oriented programming concepts and uses various Java features.

**Requirements:**
1. Create a class hierarchy with inheritance
2. Implement interfaces
3. Use collections to manage data
4. Handle exceptions appropriately
5. Use generics for type safety
6. Include unit tests

**Example Implementation:**

```java
// Interface
interface Payable {
    double calculatePayment();
}

// Abstract class
abstract class Employee implements Payable {
    protected String name;
    protected double baseSalary;
    
    public Employee(String name, double baseSalary) {
        this.name = name;
        this.baseSalary = baseSalary;
    }
    
    public String getName() {
        return name;
    }
    
    @Override
    public String toString() {
        return "Employee: " + name;
    }
}

// Concrete classes
class Manager extends Employee {
    private double bonus;
    
    public Manager(String name, double baseSalary, double bonus) {
        super(name, baseSalary);
        this.bonus = bonus;
    }
    
    @Override
    public double calculatePayment() {
        return baseSalary + bonus;
    }
}

class Developer extends Employee {
    private int hoursWorked;
    private double hourlyRate;
    
    public Developer(String name, double baseSalary, int hoursWorked, double hourlyRate) {
        super(name, baseSalary);
        this.hoursWorked = hoursWorked;
        this.hourlyRate = hourlyRate;
    }
    
    @Override
    public double calculatePayment() {
        return baseSalary + (hoursWorked * hourlyRate);
    }
}

// Main application
import java.util.*;

public class PayrollSystem {
    public static void main(String[] args) {
        List<Employee> employees = new ArrayList<>();
        
        try {
            // Create employees
            Manager manager = new Manager("Alice Johnson", 80000, 10000);
            Developer dev1 = new Developer("Bob Smith", 70000, 160, 50);
            Developer dev2 = new Developer("Charlie Brown", 65000, 150, 45);
            
            employees.add(manager);
            employees.add(dev1);
            employees.add(dev2);
            
            // Calculate total payroll
            double totalPayroll = 0;
            System.out.println("Employee Payroll:");
            for (Employee emp : employees) {
                double payment = emp.calculatePayment();
                totalPayroll += payment;
                System.out.printf("%s: $%.2f%n", emp.getName(), payment);
            }
            
            System.out.printf("Total Payroll: $%.2f%n", totalPayroll);
            
        } catch (Exception e) {
            System.out.println("Error: " + e.getMessage());
        }
    }
}
```

## Learning Outcomes
By the end of this module, students will be able to:
- Write basic Java programs using variables, control structures, and methods
- Design and implement object-oriented programs with classes, inheritance, and polymorphism
- Use advanced Java features like generics, collections, and exception handling
- Create and use annotations and understand reflection basics
- Manage Java projects with Maven or Gradle
- Build simple applications demonstrating OOP principles

## Resources
- "Java: A Beginner's Guide" by Herbert Schildt
- Oracle Java Tutorials: https://docs.oracle.com/javase/tutorial/
- Maven Documentation: https://maven.apache.org/guides/
- Gradle Documentation: https://docs.gradle.org/
- Online IDE: https://www.onlinegdb.com/online_java_compiler