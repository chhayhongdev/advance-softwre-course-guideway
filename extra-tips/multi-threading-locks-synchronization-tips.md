# Multi-Threading Tips: Resource Locks and Synchronization

## Overview
Multi-threading allows concurrent execution of tasks, but shared resources can lead to data corruption, race conditions, and deadlocks. This guide provides practical tips for handling resource locking and synchronization in Java applications.

## Why Synchronization is Required

### 1. **Race Conditions**
**Problem**: Multiple threads accessing shared data simultaneously, leading to inconsistent results.

```java
public class Counter {
    private int count = 0;

    public void increment() {
        count++;  // Not atomic - race condition!
    }

    public int getCount() {
        return count;
    }
}

// Usage causing race condition:
Counter counter = new Counter();
ExecutorService executor = Executors.newFixedThreadPool(10);

for (int i = 0; i < 1000; i++) {
    executor.submit(() -> counter.increment());
}

executor.shutdown();
// Result: count < 1000 (inconsistent!)
```

**Solution**: Use `synchronized` or atomic operations.

### 2. **Memory Visibility Issues**
**Problem**: Changes made by one thread may not be visible to other threads due to CPU caching.

```java
public class SharedFlag {
    private boolean flag = false;

    public void setFlag(boolean value) {
        flag = value;  // May not be visible to other threads
    }

    public boolean isFlag() {
        return flag;  // May read stale value
    }
}
```

**Solution**: Use `volatile` or proper synchronization.

### 3. **Atomicity Violations**
**Problem**: Operations that seem atomic but aren't at the machine level.

```java
// This looks atomic but isn't:
if (account.getBalance() >= amount) {
    account.withdraw(amount);  // Race condition between check and withdraw
}
```

## Synchronization Techniques

### 1. **Synchronized Methods**
```java
public class SynchronizedCounter {
    private int count = 0;

    public synchronized void increment() {
        count++;
    }

    public synchronized int getCount() {
        return count;
    }
}
```

**Tips**:
- Use for simple cases
- Entire method is locked - can cause performance issues
- Only one thread can execute any synchronized method at a time

### 2. **Synchronized Blocks**
```java
public class BetterCounter {
    private final Object lock = new Object();
    private int count = 0;

    public void increment() {
        synchronized (lock) {
            count++;  // Only this block is locked
        }
    }

    public int getCount() {
        synchronized (lock) {
            return count;
        }
    }
}
```

**Tips**:
- More granular control than synchronized methods
- Use private final lock objects
- Reduces lock contention

### 3. **Volatile Keyword**
```java
public class VolatileExample {
    private volatile boolean shutdown = false;

    public void shutdown() {
        shutdown = true;
    }

    public void doWork() {
        while (!shutdown) {
            // Do work - will see shutdown changes immediately
        }
    }
}
```

**Tips**:
- Ensures visibility of changes across threads
- Doesn't provide atomicity for compound operations
- Good for flags and single variable updates

### 4. **Atomic Classes**
```java
import java.util.concurrent.atomic.*;

public class AtomicCounter {
    private AtomicInteger count = new AtomicInteger(0);
    private AtomicLong total = new AtomicLong(0);

    public void increment() {
        count.incrementAndGet();
    }

    public int getCount() {
        return count.get();
    }

    public long addAndGetTotal(long value) {
        return total.addAndGet(value);
    }
}
```

**Tips**:
- Lock-free operations using CAS (Compare-And-Swap)
- Better performance than synchronized blocks
- Available for primitives: AtomicInteger, AtomicLong, AtomicBoolean, AtomicReference

### 5. **ReentrantLock**
```java
import java.util.concurrent.locks.*;

public class ReentrantLockExample {
    private final ReentrantLock lock = new ReentrantLock();
    private int count = 0;

    public void increment() {
        lock.lock();
        try {
            count++;
        } finally {
            lock.unlock();  // Always unlock in finally block
        }
    }

    public int getCount() {
        lock.lock();
        try {
            return count;
        } finally {
            lock.unlock();
        }
    }
}
```

**Tips**:
- More flexible than synchronized
- Supports tryLock() for non-blocking acquisition
- Can be interrupted with lockInterruptibly()
- Supports fairness policy

## Common Pitfalls and Solutions

### 1. **Deadlocks**
**Problem**: Two or more threads waiting for each other to release locks.

```java
// Deadlock example
public class DeadlockExample {
    private final Object lock1 = new Object();
    private final Object lock2 = new Object();

    public void method1() {
        synchronized (lock1) {
            synchronized (lock2) {  // Thread 2 might hold lock2
                // Do work
            }
        }
    }

    public void method2() {
        synchronized (lock2) {
            synchronized (lock1) {  // Thread 1 might hold lock1
                // Do work
            }
        }
    }
}
```

**Prevention Tips**:
- Always acquire locks in the same order
- Use timeout-based locking
- Minimize lock scope
- Consider lock hierarchy

### 2. **Lock Contention**
**Problem**: Too many threads competing for the same lock, causing performance degradation.

**Solutions**:
- Use finer-grained locks
- Consider lock-free data structures
- Use ReadWriteLock for read-heavy scenarios
- Implement lock striping

### 3. **Starvation**
**Problem**: Some threads never get access to shared resources.

**Solutions**:
- Use fair locks when appropriate
- Avoid long-running operations while holding locks
- Consider priority-based scheduling

## Advanced Synchronization Patterns

### 1. **ReadWriteLock**
```java
import java.util.concurrent.locks.*;

public class ReadWriteExample {
    private final ReadWriteLock lock = new ReentrantReadWriteLock();
    private final Lock readLock = lock.readLock();
    private final Lock writeLock = lock.writeLock();
    private Map<String, String> cache = new HashMap<>();

    public String get(String key) {
        readLock.lock();
        try {
            return cache.get(key);
        } finally {
            readLock.unlock();
        }
    }

    public void put(String key, String value) {
        writeLock.lock();
        try {
            cache.put(key, value);
        } finally {
            writeLock.unlock();
        }
    }
}
```

**Tips**:
- Multiple readers can access simultaneously
- Only one writer at a time
- Ideal for read-heavy workloads

### 2. **StampedLock (Java 8+)**
```java
import java.util.concurrent.locks.*;

public class StampedLockExample {
    private final StampedLock lock = new StampedLock();
    private double x, y;

    public void move(double deltaX, double deltaY) {
        long stamp = lock.writeLock();
        try {
            x += deltaX;
            y += deltaY;
        } finally {
            lock.unlockWrite(stamp);
        }
    }

    public double distanceFromOrigin() {
        long stamp = lock.tryOptimisticRead();
        double currentX = x, currentY = y;

        if (!lock.validate(stamp)) {
            stamp = lock.readLock();
            try {
                currentX = x;
                currentY = y;
            } finally {
                lock.unlockRead(stamp);
            }
        }

        return Math.sqrt(currentX * currentX + currentY * currentY);
    }
}
```

**Tips**:
- Optimistic reading for better performance
- Convert to pessimistic locking if needed
- Complex but powerful for specific use cases

### 3. **Semaphore**
```java
import java.util.concurrent.*;

public class SemaphoreExample {
    private final Semaphore semaphore = new Semaphore(3); // Allow 3 concurrent accesses

    public void accessResource() {
        try {
            semaphore.acquire();
            // Access limited resource
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            semaphore.release();
        }
    }
}
```

**Tips**:
- Control access to limited resources
- Can be used for rate limiting
- Supports fairness

## Thread-Safe Collections

### 1. **Concurrent Collections**
```java
// Instead of synchronized collections:
Map<String, String> syncMap = Collections.synchronizedMap(new HashMap<>()); // Slow

// Use concurrent collections:
ConcurrentHashMap<String, String> concurrentMap = new ConcurrentHashMap<>(); // Fast
ConcurrentLinkedQueue<String> queue = new ConcurrentLinkedQueue<>();
CopyOnWriteArrayList<String> list = new CopyOnWriteArrayList<>();
```

### 2. **Blocking Queues**
```java
import java.util.concurrent.*;

public class ProducerConsumer {
    private final BlockingQueue<Integer> queue = new LinkedBlockingQueue<>(10);

    public void produce(int item) throws InterruptedException {
        queue.put(item);  // Blocks if queue is full
    }

    public int consume() throws InterruptedException {
        return queue.take();  // Blocks if queue is empty
    }
}
```

## Performance Considerations

### 1. **Lock Granularity**
```java
// Bad: Coarse-grained locking
public synchronized void processLargeData(List<Data> data) {
    for (Data item : data) {
        // Process each item - lock held for entire operation
        heavyComputation(item);
    }
}

// Better: Fine-grained locking
public void processLargeData(List<Data> data) {
    for (Data item : data) {
        synchronized (item) {  // Lock per item
            heavyComputation(item);
        }
    }
}
```

### 2. **Lock Elimination**
```java
// JVM may eliminate this lock if string is thread-local
public String getThreadLocalString() {
    synchronized (this) {
        return Thread.currentThread().getName();
    }
}
```

### 3. **Avoid Hotspots**
```java
// Bad: Single lock for all operations
private final Object singleLock = new Object();

// Better: Multiple locks for different resources
private final Object userLock = new Object();
private final Object orderLock = new Object();
private final Object inventoryLock = new Object();
```

## Testing Multi-Threaded Code

### 1. **Unit Testing**
```java
@Test
public void testConcurrentCounter() throws InterruptedException {
    Counter counter = new Counter();
    ExecutorService executor = Executors.newFixedThreadPool(10);
    CountDownLatch latch = new CountDownLatch(1000);

    for (int i = 0; i < 1000; i++) {
        executor.submit(() -> {
            counter.increment();
            latch.countDown();
        });
    }

    latch.await();
    executor.shutdown();

    assertEquals(1000, counter.getCount());
}
```

### 2. **Stress Testing**
```java
public class StressTest {
    public static void main(String[] args) throws InterruptedException {
        Counter counter = new Counter();
        ExecutorService executor = Executors.newCachedThreadPool();

        // Run for 30 seconds
        long endTime = System.currentTimeMillis() + 30000;

        while (System.currentTimeMillis() < endTime) {
            executor.submit(() -> {
                for (int i = 0; i < 1000; i++) {
                    counter.increment();
                }
            });
        }

        executor.shutdown();
        executor.awaitTermination(1, TimeUnit.MINUTES);

        System.out.println("Final count: " + counter.getCount());
    }
}
```

## Best Practices Summary

### 1. **Design Principles**
- Prefer immutable objects when possible
- Use thread-local variables for thread-specific data
- Design for concurrency from the beginning
- Document thread-safety guarantees

### 2. **Performance Tips**
- Use atomic operations when possible
- Prefer concurrent collections over synchronized wrappers
- Minimize lock scope and duration
- Consider lock-free algorithms for high-contention scenarios

### 3. **Debugging Tips**
- Use thread dumps: `jstack <pid>`
- Enable JVM thread contention monitoring
- Use profiler tools (VisualVM, JProfiler)
- Add logging for lock acquisition/release

### 4. **Common Patterns**
- Producer-Consumer pattern with BlockingQueue
- Thread Pool pattern with ExecutorService
- Worker Thread pattern for background processing
- Monitor pattern for object synchronization

## Real-World Scenarios

### 1. **Database Connection Pooling**
```java
// Thread-safe connection pool
public class ConnectionPool {
    private final Semaphore semaphore;
    private final Queue<Connection> connections;

    public ConnectionPool(int maxConnections) {
        semaphore = new Semaphore(maxConnections);
        connections = new ConcurrentLinkedQueue<>();
    }

    public Connection getConnection() throws InterruptedException {
        semaphore.acquire();
        Connection conn = connections.poll();
        if (conn == null) {
            conn = createNewConnection();
        }
        return conn;
    }

    public void releaseConnection(Connection conn) {
        connections.offer(conn);
        semaphore.release();
    }
}
```

### 2. **Cache Implementation**
```java
public class ThreadSafeCache<K, V> {
    private final ConcurrentHashMap<K, V> cache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<K, Long> timestamps = new ConcurrentHashMap<>();

    public V get(K key) {
        V value = cache.get(key);
        if (value != null) {
            timestamps.put(key, System.currentTimeMillis());
        }
        return value;
    }

    public void put(K key, V value) {
        cache.put(key, value);
        timestamps.put(key, System.currentTimeMillis());
    }

    public void cleanupExpired(long maxAge) {
        long cutoff = System.currentTimeMillis() - maxAge;
        timestamps.entrySet().removeIf(entry -> entry.getValue() < cutoff);
        cache.keySet().removeIf(key -> !timestamps.containsKey(key));
    }
}
```

Remember: Multi-threading with proper synchronization is complex. Always test thoroughly and consider using higher-level abstractions when possible!