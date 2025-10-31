# Networking Fundamentals: TCP, UDP, DNS, IP Addresses & Headers

## Overview
Networking forms the backbone of distributed systems. Understanding protocols, addressing, and packet structure is essential for designing reliable, efficient network communications.

## 1. TCP (Transmission Control Protocol)

### TCP Characteristics

#### **Connection-Oriented Protocol**
- **Three-Way Handshake**: Establishes reliable connection before data transfer
- **Reliable Delivery**: Guarantees packet delivery and maintains order
- **Flow Control**: Prevents sender from overwhelming receiver
- **Congestion Control**: Adapts to network congestion conditions

#### **TCP Connection Establishment**
```
Client                    Server
  |                         |
  |-------- SYN ----------->|  Step 1: Client sends SYN packet
  | (SEQ=x)                 |         with initial sequence number
  |                         |
  |<------- SYN-ACK ------- |  Step 2: Server responds with SYN-ACK
  | (SEQ=y, ACK=x+1)        |         acknowledging client's SYN
  |                         |
  |-------- ACK ----------->|  Step 3: Client acknowledges server's SYN
  | (SEQ=x+1, ACK=y+1)      |         Connection established
  |                         |
```

#### **TCP Connection Termination**
```
Client                    Server
  |                         |
  |-------- FIN ----------->|  Step 1: Client initiates close
  |                         |
  |<------- ACK ----------- |  Step 2: Server acknowledges FIN
  |                         |
  |<------- FIN ----------- |  Step 3: Server sends its own FIN
  |                         |
  |-------- ACK ----------->|  Step 4: Client acknowledges server's FIN
  |                         |
  |    Connection Closed     |
```

### TCP Flow Control

#### **Sliding Window Mechanism**
- **Purpose**: Controls amount of unacknowledged data in transit
- **Sender Window**: Limits outstanding packets
- **Receiver Window**: Advertises buffer availability
- **Dynamic Adjustment**: Window size changes based on network conditions

#### **Window Size Management**
- **Initial Window**: Starts small to avoid overwhelming network
- **Slow Start**: Exponentially increases window size
- **Congestion Avoidance**: Linear increase after slow start
- **Fast Retransmit**: Detects and recovers from lost packets

### TCP Congestion Control

#### **Additive Increase, Multiplicative Decrease (AIMD)**
- **Congestion Window (cwnd)**: Limits packets sent per RTT
- **Slow Start Phase**: cwnd doubles each RTT
- **Congestion Avoidance**: cwnd increases by 1 each RTT
- **Congestion Detection**: Reduces cwnd when packet loss occurs

#### **TCP Variants**
- **TCP Reno**: Fast retransmit and fast recovery
- **TCP New Reno**: Improved recovery for multiple losses
- **TCP Cubic**: Optimized for high-bandwidth networks
- **TCP BBR**: Bottleneck Bandwidth and Round-trip time algorithm

## 2. UDP (User Datagram Protocol)

### UDP Characteristics

#### **Connectionless Protocol**
- **No Handshake**: Sends data without establishing connection
- **Unreliable Delivery**: No guarantees about packet arrival or order
- **No Flow Control**: No built-in congestion or flow control
- **Low Overhead**: Minimal protocol headers and processing

#### **UDP vs TCP Comparison**

| Aspect | TCP | UDP |
|--------|-----|-----|
| Connection | Connection-oriented | Connectionless |
| Reliability | Reliable, ordered | Unreliable, unordered |
| Speed | Slower (overhead) | Faster (minimal overhead) |
| Use Cases | File transfer, web browsing | Streaming, gaming, DNS |
| Header Size | 20 bytes minimum | 8 bytes fixed |

### UDP Applications

#### **Real-time Applications**
- **Streaming Media**: Video/audio streaming tolerates some loss
- **Online Gaming**: Low latency more important than perfect reliability
- **VoIP**: Voice over IP prefers timeliness over retransmission
- **IoT Sensors**: High-frequency data where occasional loss is acceptable

#### **Query-Response Protocols**
- **DNS**: Domain name resolution
- **DHCP**: IP address assignment
- **SNMP**: Network management queries
- **NTP**: Network time synchronization

## 3. DNS (Domain Name System)

### DNS Architecture

#### **Hierarchical Structure**
- **Root Servers**: Top-level domain servers (13 globally)
- **TLD Servers**: .com, .org, .net, country domains
- **Authoritative Servers**: Domain-specific name servers
- **Recursive Resolvers**: Client-facing DNS servers

#### **DNS Resolution Process**
```
1. Client queries recursive resolver
2. Resolver queries root server for TLD
3. Resolver queries TLD server for domain
4. Resolver queries authoritative server
5. Authoritative server returns IP address
6. Resolver caches and returns to client
```

### DNS Record Types

#### **Common Resource Records**
- **A Record**: Maps domain to IPv4 address
- **AAAA Record**: Maps domain to IPv6 address
- **CNAME Record**: Canonical name alias
- **MX Record**: Mail exchange server
- **TXT Record**: Text information (SPF, DKIM)
- **SRV Record**: Service location records

#### **DNS Caching**
- **Browser Cache**: Client-side DNS caching
- **OS Cache**: Operating system DNS resolution cache
- **Resolver Cache**: ISP or local DNS server cache
- **TTL (Time To Live)**: Cache validity duration

### DNS Security

#### **DNSSEC (DNS Security Extensions)**
- **Digital Signatures**: Authenticates DNS responses
- **Chain of Trust**: Validates from root to domain
- **Prevents Spoofing**: Protects against DNS cache poisoning
- **Key Management**: Manages cryptographic keys

#### **DNS over HTTPS/TLS**
- **DoH (DNS over HTTPS)**: Encrypts DNS queries over HTTPS
- **DoT (DNS over TLS)**: Encrypts DNS over dedicated TLS connection
- **Privacy Protection**: Prevents eavesdropping and manipulation
- **Adoption**: Increasingly supported by browsers and resolvers

## 4. IP Addressing

### IPv4 Addressing

#### **Address Structure**
- **32-bit Address**: Four octets (0-255 each)
- **Network Portion**: Identifies network segment
- **Host Portion**: Identifies specific device
- **Subnet Mask**: Separates network from host bits

#### **Classful Addressing**
- **Class A**: 0.0.0.0 - 127.255.255.255 (255.0.0.0 mask)
- **Class B**: 128.0.0.0 - 191.255.255.255 (255.255.0.0 mask)
- **Class C**: 192.0.0.0 - 223.255.255.255 (255.255.255.0 mask)
- **Class D**: 224.0.0.0 - 239.255.255.255 (Multicast)
- **Class E**: 240.0.0.0 - 255.255.255.255 (Reserved)

#### **CIDR (Classless Inter-Domain Routing)**
- **Flexible Subnetting**: Variable-length subnet masks
- **Prefix Notation**: 192.168.1.0/24 (24 network bits)
- **Supernetting**: Combines multiple networks
- **Route Aggregation**: Reduces routing table size

### IPv6 Addressing

#### **128-bit Address Space**
- **Hexadecimal Notation**: Eight 16-bit groups separated by colons
- **Address Compression**: Leading zeros and consecutive zeros
- **Example**: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
- **Compressed**: 2001:db8:85a3::8a2e:370:7334

#### **IPv6 Address Types**
- **Unicast**: Single interface identifier
- **Multicast**: Group of interfaces (replaces broadcast)
- **Anycast**: Route to nearest interface in group
- **Link-local**: Local network communication (::1 for loopback)

#### **IPv6 Features**
- **Auto-configuration**: Stateless address assignment
- **Built-in Security**: IPsec mandatory
- **Larger Address Space**: 2^128 possible addresses
- **Simplified Headers**: Streamlined packet structure

## 5. IP Packet Headers

### IPv4 Header Structure

#### **Fixed Header (20 bytes)**
```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version|  IHL  |Type of Service|          Total Length         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Identification        |Flags|      Fragment Offset    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Time to Live |    Protocol   |         Header Checksum       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Source Address                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Destination Address                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Options                    |    Padding    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

#### **Key Header Fields**
- **Version**: IP protocol version (4 or 6)
- **IHL**: Internet Header Length (header size in 32-bit words)
- **Type of Service**: QoS and priority information
- **Total Length**: Packet size including header and data
- **Identification**: Packet fragmentation identifier
- **Flags**: Don't Fragment (DF) and More Fragments (MF) flags
- **Fragment Offset**: Position of fragment in original packet
- **Time to Live**: Maximum hops before packet is discarded
- **Protocol**: Transport layer protocol (TCP=6, UDP=17)
- **Header Checksum**: Error detection for header
- **Source/Destination Address**: 32-bit IP addresses

### IPv6 Header Structure

#### **Simplified Header (40 bytes)**
```
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version| Traffic Class |           Flow Label                  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Payload Length        |  Next Header |   Hop Limit    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                                                               +
|                                                               |
+                         Source Address                        +
|                                                               |
+                                                               +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                                                               +
|                                                               |
+                   Destination Address                         +
|                                                               +
+                                                               +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

#### **IPv6 Improvements**
- **Fixed Header Size**: No options in base header
- **Extension Headers**: Optional headers for additional features
- **Flow Label**: Supports quality of service
- **No Checksum**: Relies on upper-layer checksums
- **Larger Addresses**: 128-bit source and destination

## 6. Network Troubleshooting

### Common Network Issues

#### **Connectivity Problems**
- **Physical Layer**: Cable faults, interface failures
- **Data Link Layer**: MAC address conflicts, switch failures
- **Network Layer**: Routing issues, IP configuration errors
- **Transport Layer**: Port conflicts, firewall blocking

#### **Performance Issues**
- **Latency**: High round-trip times
- **Packet Loss**: Dropped packets affecting reliability
- **Throughput**: Insufficient bandwidth or congestion
- **Jitter**: Variable latency affecting real-time applications

### Diagnostic Tools

#### **Network Testing Utilities**
- **ping**: Test connectivity and latency
- **traceroute/tracert**: Trace packet path and identify bottlenecks
- **netstat**: Display network connections and statistics
- **nslookup/dig**: DNS resolution testing
- **tcpdump/wireshark**: Packet capture and analysis

#### **Performance Monitoring**
- **Bandwidth Testing**: iperf, speedtest
- **Latency Measurement**: ping, mtr
- **Packet Analysis**: Wireshark protocol dissection
- **Network Statistics**: ifconfig, ip route

## 7. Network Security Fundamentals

### Firewall Concepts

#### **Packet Filtering**
- **Stateless Filtering**: Examines individual packets
- **Stateful Inspection**: Tracks connection state
- **Application Layer**: Deep packet inspection
- **Next-Generation Firewalls**: Advanced threat protection

#### **Network Address Translation (NAT)**
- **Static NAT**: One-to-one address mapping
- **Dynamic NAT**: Pool-based address assignment
- **PAT (Port Address Translation)**: Many-to-one with port mapping
- **IPv4 Conservation**: Extends IPv4 address space

### Virtual Private Networks (VPN)

#### **VPN Types**
- **Site-to-Site VPN**: Connects entire networks
- **Remote Access VPN**: Individual user connections
- **SSL VPN**: Browser-based secure access
- **IPsec VPN**: Protocol-level security

#### **VPN Protocols**
- **PPTP**: Point-to-Point Tunneling Protocol
- **L2TP**: Layer 2 Tunneling Protocol
- **SSTP**: Secure Socket Tunneling Protocol
- **OpenVPN**: Open-source VPN solution

## Summary

Networking fundamentals provide the foundation for distributed systems:

1. **TCP**: Reliable, connection-oriented transport with flow and congestion control
2. **UDP**: Fast, connectionless transport for real-time applications
3. **DNS**: Hierarchical name resolution system with caching
4. **IP Addressing**: Logical addressing schemes (IPv4/IPv6)
5. **Packet Headers**: Protocol-specific information for routing and delivery
6. **Troubleshooting**: Systematic approach to network problem diagnosis
7. **Security**: Basic network protection mechanisms

Understanding these concepts enables effective network design, troubleshooting, and optimization for distributed applications.