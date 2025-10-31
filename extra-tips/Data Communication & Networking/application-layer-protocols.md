# Application Layer Protocols

## Overview
Application layer protocols define how applications communicate over networks. Understanding these protocols is essential for designing APIs, real-time applications, and IoT systems.

## 1. HTTP (HyperText Transfer Protocol)

### HTTP Methods

#### **GET**
- **Purpose**: Retrieve resource information
- **Idempotent**: Yes (multiple identical requests have same effect)
- **Safe**: Yes (doesn't modify server state)
- **Caching**: Supported
- **Use Cases**: Fetching data, reading resources

#### **POST**
- **Purpose**: Create new resources or submit data
- **Idempotent**: No (multiple requests create multiple resources)
- **Safe**: No (modifies server state)
- **Caching**: Not typically cached
- **Use Cases**: Form submissions, creating records

#### **PUT**
- **Purpose**: Update entire resource (full replacement)
- **Idempotent**: Yes (multiple requests have same result)
- **Safe**: No (modifies server state)
- **Caching**: Can be cached
- **Use Cases**: Complete resource updates

#### **PATCH**
- **Purpose**: Partial resource modification
- **Idempotent**: Yes (multiple requests have same result)
- **Safe**: No (modifies server state)
- **Caching**: Can be cached
- **Use Cases**: Partial updates, incremental changes

#### **DELETE**
- **Purpose**: Remove resources
- **Idempotent**: Yes (deleting non-existent resource is same as deleting existing)
- **Safe**: No (modifies server state)
- **Caching**: Can be cached
- **Use Cases**: Resource deletion

### HTTP Status Codes

#### **1xx Informational**
- **100 Continue**: Client should continue with request
- **101 Switching Protocols**: Server switching protocols as requested
- **Purpose**: Provide information about request processing status

#### **2xx Success**
- **200 OK**: Request successful
- **201 Created**: Resource successfully created
- **202 Accepted**: Request accepted for processing
- **204 No Content**: Success but no content to return
- **Purpose**: Indicate successful request processing

#### **3xx Redirection**
- **301 Moved Permanently**: Resource permanently moved
- **302 Found**: Resource temporarily moved
- **304 Not Modified**: Resource not modified (caching)
- **Purpose**: Redirect client to different resource location

#### **4xx Client Error**
- **400 Bad Request**: Malformed request syntax
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource doesn't exist
- **405 Method Not Allowed**: HTTP method not supported
- **409 Conflict**: Request conflicts with current state
- **422 Unprocessable Entity**: Valid syntax but semantic errors
- **Purpose**: Indicate client-side errors

#### **5xx Server Error**
- **500 Internal Server Error**: Unexpected server error
- **501 Not Implemented**: Server doesn't support functionality
- **502 Bad Gateway**: Invalid response from upstream server
- **503 Service Unavailable**: Server temporarily unavailable
- **504 Gateway Timeout**: Upstream server timeout
- **Purpose**: Indicate server-side errors

### HTTP Headers

#### **Request Headers**
- **Accept**: Content types client can process
- **Authorization**: Authentication credentials
- **Cache-Control**: Caching directives
- **Content-Type**: Request body format
- **User-Agent**: Client application information
- **X-Request-ID**: Unique request identifier for tracing

#### **Response Headers**
- **Content-Type**: Response body format
- **Cache-Control**: Response caching directives
- **ETag**: Entity tag for conditional requests
- **Last-Modified**: Resource modification timestamp
- **Access-Control-***: CORS (Cross-Origin Resource Sharing) headers
- **Set-Cookie**: HTTP cookie setting

#### **Entity Headers**
- **Content-Length**: Size of message body
- **Content-Encoding**: Encoding applied to message body
- **Transfer-Encoding**: Message transfer encoding

### HTTP Version Evolution

#### **HTTP/1.1**
- **Connection Model**: One request per connection (keep-alive reduces overhead)
- **Head-of-Line Blocking**: Requests processed sequentially
- **Text-Based**: Human-readable protocol
- **Limitations**: Limited concurrent requests, verbose headers

#### **HTTP/2**
- **Multiplexing**: Multiple requests per connection simultaneously
- **Binary Protocol**: More efficient parsing
- **Server Push**: Server can send resources proactively
- **Header Compression**: HPACK algorithm reduces overhead
- **Stream Prioritization**: Request priority management

#### **HTTP/3**
- **Transport Protocol**: Built on QUIC over UDP
- **Connection Migration**: Seamless connection changes
- **Improved Performance**: Better handling of poor network conditions
- **Built-in Security**: TLS 1.3 required
- **0-RTT Handshake**: Faster connection establishment

## 2. WebSockets

### WebSocket Protocol Characteristics

#### **Full-Duplex Communication**
- **Bidirectional**: Both client and server can send messages simultaneously
- **Single Connection**: Persistent TCP connection for all communication
- **Low Overhead**: Minimal framing overhead compared to HTTP polling
- **Real-Time**: Immediate message delivery without polling

#### **Connection Establishment**
- **HTTP Upgrade**: Starts as HTTP request with upgrade header
- **Handshake**: Protocol negotiation between client and server
- **Persistent**: Connection remains open for duration of session
- **Subprotocol Negotiation**: Optional application-specific protocols

#### **Message Types**
- **Text Frames**: UTF-8 encoded text data
- **Binary Frames**: Raw binary data
- **Control Frames**: Connection management (ping, pong, close)
- **Fragmentation**: Large messages can be split across frames

### WebSocket vs HTTP Comparison

#### **Communication Patterns**
- **HTTP**: Request-response model, client-initiated
- **WebSockets**: Bidirectional, server can initiate communication
- **Polling**: Client repeatedly requests updates
- **Long Polling**: Server holds connection until data available

#### **Use Cases**
- **Real-Time Applications**: Chat, gaming, live updates
- **Collaborative Editing**: Multiple users editing simultaneously
- **Live Streaming**: Real-time data feeds
- **IoT Dashboards**: Sensor data visualization

#### **Advantages of WebSockets**
- **Reduced Latency**: No polling overhead
- **Lower Bandwidth**: Minimal protocol overhead
- **Server Push**: Server-initiated communication
- **Connection Reuse**: Single connection for all messages

## 3. WebRTC (Web Real-Time Communication)

### WebRTC Architecture Components

#### **Media Capture and Streams**
- **getUserMedia API**: Access camera and microphone
- **MediaStream**: Container for audio/video tracks
- **MediaStreamTrack**: Individual audio or video stream
- **Constraints**: Quality and capability specifications

#### **Peer-to-Peer Connections**
- **RTCPeerConnection**: Manages peer-to-peer communication
- **ICE (Interactive Connectivity Establishment)**: NAT traversal
- **STUN/TURN Servers**: Public IP discovery and relay
- **SDP (Session Description Protocol)**: Media capability negotiation

#### **Data Channels**
- **Reliable Delivery**: Guaranteed message ordering and delivery
- **Unreliable Delivery**: Low-latency with possible message loss
- **Ordered/Unordered**: Message sequencing control
- **Text and Binary**: Support for different data types

### Signaling Process

#### **Session Establishment**
- **Offer Creation**: Initiating peer creates session description
- **Answer Creation**: Responding peer creates compatible description
- **ICE Candidate Exchange**: Network connectivity information sharing
- **Connection Negotiation**: Media format and network parameter agreement

#### **Signaling Transport**
- **WebSockets**: Common signaling channel
- **HTTP**: RESTful signaling APIs
- **WebRTC Data Channel**: In-band signaling
- **External Services**: Third-party signaling servers

### NAT Traversal and Connectivity

#### **ICE Framework**
- **Host Candidates**: Direct IP addresses
- **Server Reflexive**: Public IP via STUN
- **Relayed Candidates**: TURN server relay
- **Candidate Prioritization**: Connection preference ordering

#### **STUN Protocol**
- **NAT Discovery**: Determine public IP and port
- **Connectivity Checks**: Verify peer reachability
- **Keep-Alive**: Maintain NAT mappings
- **Binding Requests**: Public address discovery

#### **TURN Protocol**
- **Media Relay**: Proxy media when direct connection fails
- **Fallback Mechanism**: Alternative to peer-to-peer
- **Server Resources**: TURN server bandwidth consumption
- **Security**: Encrypted relay connections

## 4. MQTT (Message Queuing Telemetry Transport)

### MQTT Protocol Fundamentals

#### **Publish-Subscribe Pattern**
- **Publishers**: Send messages to topics
- **Subscribers**: Receive messages from topics
- **Broker**: Message routing and delivery
- **Topics**: Hierarchical message categories

#### **Connection Model**
- **Lightweight**: Minimal protocol overhead
- **Asynchronous**: Non-blocking message delivery
- **Persistent Connections**: Long-lived TCP connections
- **Last Will and Testament**: Death notification messages

### Quality of Service Levels

#### **QoS 0 (At Most Once)**
- **Delivery Guarantee**: No acknowledgment required
- **Performance**: Highest throughput, lowest latency
- **Reliability**: Messages may be lost
- **Use Cases**: Sensor data, frequent updates where loss is acceptable

#### **QoS 1 (At Least Once)**
- **Delivery Guarantee**: Acknowledgment required
- **Performance**: Balanced throughput and reliability
- **Reliability**: Messages delivered at least once (possible duplicates)
- **Use Cases**: Most IoT applications, general messaging

#### **QoS 2 (Exactly Once)**
- **Delivery Guarantee**: Four-step handshake prevents duplicates
- **Performance**: Highest overhead, lowest throughput
- **Reliability**: Guaranteed single delivery
- **Use Cases**: Financial transactions, critical system commands

### MQTT Features

#### **Topic Filtering**
- **Wildcards**: + (single level), # (multi-level)
- **Hierarchical**: topic/subtopic/subsubtopic structure
- **Access Control**: Topic-based permissions
- **Message Routing**: Broker-based topic matching

#### **Retained Messages**
- **Persistence**: Last message stored by broker
- **New Subscribers**: Immediate delivery of retained messages
- **State Synchronization**: Current state availability
- **Configuration**: Per-topic retention settings

#### **Clean Session vs Persistent Session**
- **Clean Session**: No state maintained between connections
- **Persistent Session**: Broker maintains subscriptions and queued messages
- **Offline Queuing**: Messages queued for disconnected clients
- **QoS Considerations**: Different behavior based on session type

## 5. gRPC (Google Remote Procedure Call)

### Protocol Buffer Definition

#### **Service Definition**
- **RPC Methods**: Remote procedure declarations
- **Request/Response Types**: Message structure definitions
- **Streaming Support**: Unary, server streaming, client streaming, bidirectional
- **Service Options**: Protocol-specific configurations

#### **Message Types**
- **Scalar Types**: Basic data types (string, int32, bool, etc.)
- **Repeated Fields**: Arrays and collections
- **Nested Messages**: Complex data structures
- **Oneof**: Union types (one of several possible fields)
- **Enums**: Enumerated value sets

### Communication Patterns

#### **Unary RPC**
- **Single Request**: Client sends one message
- **Single Response**: Server sends one message
- **Synchronous**: Request-response pattern
- **Standard**: Most common RPC pattern

#### **Server Streaming**
- **Single Request**: Client sends one message
- **Multiple Responses**: Server sends stream of messages
- **Asynchronous**: Client processes responses as they arrive
- **Use Cases**: Large dataset retrieval, real-time feeds

#### **Client Streaming**
- **Multiple Requests**: Client sends stream of messages
- **Single Response**: Server sends one message
- **Aggregation**: Server processes entire stream before responding
- **Use Cases**: File uploads, batch processing

#### **Bidirectional Streaming**
- **Multiple Requests**: Client sends stream of messages
- **Multiple Responses**: Server sends stream of messages
- **Independent**: Request and response streams independent
- **Real-Time**: Both sides can send messages anytime

### gRPC Advantages

#### **Performance Benefits**
- **HTTP/2**: Multiplexing and header compression
- **Binary Protocol**: Efficient serialization
- **Code Generation**: Optimized client/server stubs
- **Streaming**: Efficient large data transfers

#### **Developer Experience**
- **Type Safety**: Strongly typed interfaces
- **Multi-Language**: Consistent APIs across languages
- **Tooling**: Rich ecosystem and debugging tools
- **Documentation**: Self-documenting APIs

## 6. GraphQL

### Schema Definition Language (SDL)

#### **Type System**
- **Object Types**: Domain entities with fields
- **Scalar Types**: Primitive values (String, Int, Boolean, etc.)
- **Interface**: Common field contracts
- **Union Types**: One of several possible types
- **Input Types**: Complex input parameters

#### **Schema Structure**
- **Query**: Read operations
- **Mutation**: Write operations
- **Subscription**: Real-time updates
- **Resolvers**: Field implementation functions

### Query Language Features

#### **Field Selection**
- **Precise Data**: Client specifies exact data needs
- **No Over-fetching**: Only requested fields returned
- **No Under-fetching**: Single request gets all needed data
- **Nested Queries**: Related data in single request

#### **Arguments and Variables**
- **Dynamic Queries**: Parameterized requests
- **Type Safety**: Schema-validated parameters
- **Complex Filtering**: Rich query capabilities
- **Pagination**: Efficient large dataset handling

### Advantages over REST

#### **Data Fetching Efficiency**
- **Single Endpoint**: All operations through one URL
- **Reduced Requests**: Fewer network round trips
- **Exact Data**: No unnecessary data transfer
- **Versioning**: Schema evolution without breaking changes

#### **Developer Experience**
- **Self-Documenting**: Schema serves as API documentation
- **Type Safety**: Compile-time query validation
- **Tooling**: Rich development tools and IDE support
- **Introspection**: Runtime API exploration

## Protocol Selection Criteria

### Performance Considerations
- **Latency Requirements**: Real-time vs batch processing
- **Bandwidth Constraints**: Mobile vs broadband networks
- **Connection Stability**: Reliable vs intermittent connectivity
- **Concurrent Connections**: Scalability requirements

### Application Characteristics
- **Real-Time Needs**: Synchronous vs asynchronous communication
- **Data Volume**: Small messages vs large payloads
- **Client Types**: Browsers, mobile apps, IoT devices
- **Network Environment**: LAN vs WAN vs Internet

### Development Factors
- **Team Expertise**: Existing skills and learning curve
- **Tooling Support**: Development tools and ecosystem
- **Maintenance**: Operational complexity and monitoring
- **Evolution**: API versioning and backward compatibility

### Recommended Protocols by Use Case

#### **Web APIs**
- **Simple CRUD**: REST with JSON
- **Complex Queries**: GraphQL
- **High Performance**: gRPC
- **Legacy Integration**: REST

#### **Real-Time Applications**
- **Browser-Based**: WebSockets
- **Peer-to-Peer**: WebRTC
- **Event-Driven**: WebSockets with pub/sub
- **Gaming**: WebRTC or custom UDP

#### **IoT and Edge Computing**
- **Constrained Devices**: MQTT
- **Reliable Delivery**: MQTT with QoS 1+
- **Low Bandwidth**: MQTT with binary payloads
- **Device Management**: MQTT with retained messages

#### **Microservices Communication**
- **Internal Services**: gRPC
- **Cross-Platform**: REST or GraphQL
- **Event Streaming**: WebSockets or MQTT
- **API Gateway**: REST or GraphQL facade

## Summary

Application layer protocols provide different communication patterns optimized for specific use cases:

1. **HTTP**: Universal web protocol with methods, status codes, and headers
2. **WebSockets**: Bidirectional real-time communication over persistent connections
3. **WebRTC**: Browser-native peer-to-peer audio, video, and data communication
4. **MQTT**: Lightweight publish-subscribe protocol for IoT and constrained networks
5. **gRPC**: High-performance RPC with contract-first development and streaming
6. **GraphQL**: Query language enabling precise, efficient data fetching

Key selection factors:
- **Performance**: Latency, throughput, and resource requirements
- **Real-time Needs**: Synchronous vs asynchronous communication patterns
- **Network Conditions**: Reliable vs unreliable, bandwidth-constrained environments
- **Client Capabilities**: Browser support, device constraints, and platform requirements
- **Development Complexity**: Learning curve, tooling, and maintenance overhead
- **Scalability**: Connection management and resource utilization patterns

Understanding these protocols enables building efficient, scalable applications that match specific communication requirements and infrastructure constraints.