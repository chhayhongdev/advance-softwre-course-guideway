# Computer Architecture Fundamentals

## Overview
Computer architecture forms the foundation of how data flows through systems. Understanding storage hierarchies, memory management, and CPU operations is crucial for designing efficient applications and troubleshooting performance issues. This guide focuses on conceptual understanding rather than implementation details.

## 1. Storage Hierarchy

### The Memory Pyramid
Computer systems organize storage in a hierarchical structure based on speed, cost, and capacity. This creates a pyramid where faster, more expensive storage sits at the top, and slower, cheaper storage forms the base.

#### **Registers (Fastest, Smallest)**
- **Purpose**: Store data currently being processed by the CPU
- **Characteristics**: 
  - Access time: < 1 nanosecond
  - Size: 64-128 bits per register
  - Volatile: Data lost when power is removed
- **Function**: Hold operands for arithmetic/logic operations and intermediate results

#### **Cache Memory (L1, L2, L3)**
- **Purpose**: Bridge the speed gap between CPU and main memory
- **Levels**:
  - **L1 Cache**: Smallest, fastest (32-64KB per core)
  - **L2 Cache**: Medium size/speed (256KB-1MB per core)
  - **L3 Cache**: Largest, shared across cores (2-32MB)
- **Principles**:
  - **Temporal Locality**: Recently accessed data likely to be accessed again
  - **Spatial Locality**: Data near recently accessed data likely to be accessed
  - **Cache Lines**: Fixed-size blocks (typically 64 bytes) transferred between cache and memory

#### **Main Memory (RAM)**
- **Purpose**: Primary workspace for running programs
- **Types**:
  - **DRAM**: Dynamic RAM, needs refreshing, used for main memory
  - **SRAM**: Static RAM, faster but more expensive, used for cache
- **Characteristics**:
  - Volatile storage
  - Random access capability
  - Much slower than cache but larger capacity

#### **Secondary Storage (Disk/SSD)**
- **Purpose**: Long-term, persistent storage
- **Types**:
  - **HDD**: Mechanical disks with spinning platters
  - **SSD**: Solid-state drives using flash memory
  - **NVMe**: PCIe-connected SSDs for highest performance
- **Characteristics**:
  - Non-volatile (persistent)
  - Much larger capacity than RAM
  - Slower access times but cheaper per byte

### Storage Performance Trade-offs
- **Speed vs Capacity**: Faster storage is more expensive and smaller
- **Volatility vs Persistence**: Fast storage loses data without power; slow storage retains data
- **Access Patterns**: Sequential vs random access performance varies by storage type

## 2. CPU Architecture Concepts

### Core Components
#### **Arithmetic Logic Unit (ALU)**
- Performs mathematical and logical operations
- Handles arithmetic (add, subtract, multiply, divide)
- Executes logical operations (AND, OR, NOT, XOR)
- Compares values for conditional operations

#### **Control Unit**
- Orchestrates the execution of instructions
- Fetches instructions from memory
- Decodes instructions to determine operations
- Coordinates data flow between components

#### **Registers**
- **General Purpose Registers**: Store data and addresses
- **Special Purpose Registers**:
  - Program Counter (PC): Points to next instruction
  - Stack Pointer (SP): Points to top of stack
  - Status Register: Stores flags (carry, zero, overflow, etc.)

### Instruction Execution Cycle
1. **Fetch**: Retrieve instruction from memory using Program Counter
2. **Decode**: Interpret the instruction and identify operation
3. **Execute**: Perform the operation using ALU
4. **Memory Access**: Read/write data from/to memory if needed
5. **Write Back**: Store results back to registers
6. **Update PC**: Point to next instruction

### Pipelining
Modern CPUs break instruction execution into stages that can run simultaneously:
- Multiple instructions can be in different stages at once
- Increases throughput but introduces complexity (hazards)
- **Hazards**:
  - **Data Hazards**: Dependencies between instructions
  - **Control Hazards**: Branch instructions disrupt sequential flow
  - **Structural Hazards**: Hardware conflicts between instructions

## 3. Memory Management

### Virtual Memory
#### **Address Translation**
- **Virtual Addresses**: What programs see (logical addresses)
- **Physical Addresses**: Actual hardware addresses
- **Page Tables**: Maps virtual pages to physical frames
- **Translation Lookaside Buffer (TLB)**: Hardware cache for page table entries

#### **Memory Protection**
- **Address Spaces**: Each process has its own virtual address space
- **Segmentation**: Divides memory into logical segments (code, data, stack)
- **Paging**: Divides memory into fixed-size pages for flexible allocation

#### **Page Replacement Algorithms**
- **FIFO (First In, First Out)**: Replace oldest page
- **LRU (Least Recently Used)**: Replace least recently accessed page
- **Optimal**: Replace page that won't be used for longest time (theoretical)
- **Clock Algorithm**: Approximation of LRU using reference bits

### Memory Allocation Strategies
#### **Contiguous Allocation**
- **Fixed Partitioning**: Memory divided into fixed-size partitions
- **Dynamic Partitioning**: Partitions created as needed
- **Placement Algorithms**:
  - First Fit: Use first available hole
  - Best Fit: Use smallest suitable hole
  - Worst Fit: Use largest available hole

#### **Non-Contiguous Allocation**
- **Paging**: Memory divided into fixed-size pages
- **Segmentation**: Memory divided into variable-size segments
- **Paged Segmentation**: Combines both approaches

## 4. I/O Subsystem

### I/O Operations
#### **Programmed I/O**
- CPU directly controls I/O device
- Polling: CPU repeatedly checks device status
- Interrupt-driven: Device interrupts CPU when ready

#### **Direct Memory Access (DMA)**
- DMA controller transfers data directly between I/O device and memory
- CPU only initiates and monitors transfer
- Reduces CPU overhead for large data transfers

### I/O Scheduling
#### **Disk Scheduling Algorithms**
- **FCFS (First Come, First Served)**: Process requests in arrival order
- **SSTF (Shortest Seek Time First)**: Service closest request first
- **SCAN**: Move head in one direction, servicing requests
- **C-SCAN**: Circular SCAN, immediately return to beginning
- **LOOK/C-LOOK**: Similar to SCAN but only go as far as needed

## 5. Parallel Processing

### Flynn's Taxonomy
#### **SISD (Single Instruction, Single Data)**
- Traditional sequential computer
- One instruction operates on one data item

#### **SIMD (Single Instruction, Multiple Data)**
- One instruction operates on multiple data items simultaneously
- Used in vector processors and GPUs
- Example: Adding two arrays element-wise

#### **MISD (Multiple Instruction, Single Data)**
- Multiple instructions operate on single data stream
- Rare in practice, mostly theoretical

#### **MIMD (Multiple Instruction, Multiple Data)**
- Multiple processors executing different instructions on different data
- Most modern multiprocessor systems

### Cache Coherency
In multiprocessor systems, multiple caches must maintain consistency:
- **Write-through**: All writes go to both cache and memory
- **Write-back**: Writes only to cache, flushed to memory later
- **MESI Protocol**:
  - **Modified**: Cache line modified, not in memory
  - **Exclusive**: Cache line only in this cache
  - **Shared**: Cache line in multiple caches
  - **Invalid**: Cache line invalid

### Memory Consistency Models
- **Sequential Consistency**: Operations appear in program order
- **Total Store Order (TSO)**: Stores are ordered, loads may be reordered
- **Partial Store Order (PSO)**: Some store reordering allowed
- **Relaxed Memory Models**: More reordering for performance

## 6. Performance Metrics

### Throughput and Latency
- **Latency**: Time to complete a single operation
- **Throughput**: Number of operations completed per unit time
- **Bandwidth**: Amount of data transferred per unit time

### Amdahl's Law
Performance improvement is limited by the serial portion of a program:
```
Speedup = 1 / ((1 - P) + P/N)
```
Where:
- P = fraction of program that can be parallelized
- N = number of processors

### Little's Law
For stable systems: Mean number of jobs = Arrival rate × Mean response time

## 7. Power and Energy Considerations

### Dynamic Power Consumption
- **Switching Power**: Power consumed when transistors switch
- **Short-Circuit Power**: Power during brief short circuits
- **Leakage Power**: Power consumed by leakage currents

### Power Management Techniques
- **Dynamic Voltage Scaling (DVS)**: Adjust voltage based on performance needs
- **Dynamic Frequency Scaling (DFS)**: Adjust clock frequency
- **Clock Gating**: Disable clock signals to unused circuit portions
- **Power Gating**: Completely shut off power to unused sections

## 8. Reliability and Fault Tolerance

### Reliability Metrics
- **MTBF (Mean Time Between Failures)**: Average time between failures
- **MTTR (Mean Time To Repair)**: Average time to repair a failure
- **Availability**: MTBF / (MTBF + MTTR)

### Fault Tolerance Techniques
- **Redundancy**: Duplicate components (hardware/software)
- **Error Detection**: Parity bits, checksums, ECC memory
- **Error Correction**: Hamming codes, Reed-Solomon codes
- **Recovery**: Checkpointing, rollback recovery

## Key Design Principles

### 1. **Locality Principle**
- **Temporal Locality**: Recently accessed items likely to be accessed again
- **Spatial Locality**: Items near recently accessed items likely to be accessed
- Design systems to exploit these patterns for better performance

### 2. **Parallelism Principle**
- **Instruction Level Parallelism (ILP)**: Execute multiple instructions simultaneously
- **Thread Level Parallelism (TLP)**: Execute multiple threads concurrently
- **Data Level Parallelism (DLP)**: Operate on multiple data elements simultaneously

### 3. **Dependability Principle**
- Systems must be reliable, available, and secure
- Trade-offs between performance, cost, and dependability
- Redundancy and fault tolerance are essential for critical systems

### 4. **Energy Efficiency Principle**
- Power consumption is a first-class design constraint
- Energy-efficient designs consider the entire system lifecycle
- Dynamic adaptation based on workload requirements

## Summary

Computer architecture provides the conceptual foundation for understanding:
- **Performance Limitations**: Why certain operations are faster than others
- **Design Trade-offs**: Speed vs cost vs reliability decisions
- **Scalability Constraints**: How systems grow and what limits growth
- **Optimization Opportunities**: Where to focus performance improvement efforts

The key insight is that computer systems are built on layers of abstractions, each optimizing different aspects of the speed/cost/capacity trade-off. Understanding these layers allows developers to make informed decisions about system design, performance optimization, and scalability planning.