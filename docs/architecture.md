# System Architecture

## Overview

The Event Ticket Booking Platform is a highly scalable, distributed system designed to handle high-concurrency scenarios where thousands of users simultaneously attempt to book seats for popular events.

```
┌─────────────────────────────────────────────────────────────┐
│                      Internet / Load Balancer               │
└────────────┬────────────────────────────────────┬───────────┘
             │                                    │
        ┌────▼────┐  ┌────────┐  ┌────────┐  ┌───▼────┐
        │ Frontend │  │Backend │  │Backend │  │Backend │
        │ (Nginx)  │  │Node #1 │  │Node #2 │  │Node #3 │
        └────┬────┘  └────┬───┘  └───┬────┘  └───┬────┘
             │           │           │           │
             └───────────┼───────────┼───────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
      ┌───▼──┐      ┌───▼───┐    ┌────▼────┐
      │Redis │      │MongoDB │    │BullMQ   │
      │      │      │        │    │Workers  │
      └──────┘      └────────┘    └─────────┘
```

## Components

### 1. Frontend (React + Vite)

**Responsibilities:**
- User interface for browsing events
- Seat selection and real-time seat status
- Payment initiation
- Booking management
- User authentication

**Key Technologies:**
- React 18 with TypeScript
- Redux Toolkit for global state (auth, user)
- React Query for server state (events, bookings)
- Socket.IO client for real-time updates
- Tailwind CSS for styling

**Architecture Pattern:**
- Page-based structure for routing
- Component composition with hooks
- API service layer for backend communication
- Redux slices for auth/user state

### 2. Backend (Express + Node.js)

**Responsibilities:**
- API endpoint handling
- Business logic and validation
- Database operations
- Payment processing
- Real-time event broadcasting
- Background job management

**Key Technologies:**
- Express.js with TypeScript
- Mongoose for MongoDB ODM
- Redis for caching and locking
- Socket.IO for real-time communication
- BullMQ for job queue
- JWT for authentication

**Architecture Pattern:**

```
Request → Middleware → Route → Controller → Service → Repository → Database
                       ↓
                   Validation
```

**Folder Structure:**

```
backend/src/
├── config/           # Database, Redis, App setup
├── modules/          # Feature modules
│   ├── auth/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── routes/
│   │   └── validators/
│   ├── events/
│   ├── bookings/
│   ├── payments/
│   └── ...
├── middleware/       # Express middleware (auth, error, etc.)
├── utils/           # Utility functions
├── types/           # TypeScript interfaces and types
├── validators/      # Zod schemas for validation
├── jobs/            # BullMQ job handlers
├── sockets/         # Socket.IO event handlers
└── index.ts         # Server entry point
```

### 3. Database (MongoDB)

**Purpose:** Persistent storage of all application data

**Key Collections:**
- Users
- Events
- Venues & Seats
- Bookings
- Payments
- Tickets
- Coupons
- Reviews
- AuditLogs

**Design Principles:**
- Normalized schema with references
- Strategic indexing for query optimization
- Support for transactions (ACID)
- Replica set for high availability

### 4. Redis

**Purpose:** Caching, distributed locking, and coordination

**Use Cases:**

1. **Seat Locking** (Critical for preventing double-booking)
   ```
   Key: event:{eventId}:seat:{seatId}
   Value: {userId, lockId, expiresAt}
   TTL: 300 seconds (5 minutes)
   ```

2. **Rate Limiting**
   ```
   Key: rate-limit:{userId}:{endpoint}
   Value: request_count
   TTL: 900 seconds (15 minutes)
   ```

3. **Caching**
   ```
   Popular events, categories, venue details
   TTL: 3600 seconds (1 hour)
   ```

4. **Socket.IO Pub/Pub Channel**
   ```
   Channels for broadcast between backend instances
   ```

### 5. Socket.IO

**Purpose:** Real-time bidirectional communication

**Rooms & Events:**
- `event:{eventId}` → Room for users viewing an event
- `user:{userId}` → Personal user notifications
- `admin` → Admin system events

**Events Broadcast:**
- `seat:locked` → Seat has been locked
- `seat:released` → Lock expired or user released
- `seat:booked` → Seat is permanently booked
- `booking:status` → Booking status changed
- `notification` → Server-to-client notifications

**Scaling with Redis Adapter:**
```
Backend Instance 1 → 
  Socket Event → Redis Pub/Sub → 
Backend Instance 2 → All connected clients
Backend Instance 3 →
```

### 6. BullMQ & Worker Processes

**Purpose:** Asynchronous, reliable job processing

**Job Queues:**
- `email-notifications` → Send emails
- `ticket-generation` → Generate QR codes
- `booking-expiration` → Auto-expire locked seats
- `payment-reconciliation` → Reconcile failed payments
- `refund-processing` → Process refunds
- `event-reminders` → Send event reminders
- `cleanup` → Database cleanup jobs

**Features:**
- Automatic retries with exponential backoff
- Delayed job scheduling
- Idempotent job execution
- Failed job handling (dead-letter queue)
- Job monitoring and metrics

## Data Flow Patterns

### High-Concurrency Seat Booking

```
User 1 ──┐                           ┌──→ ✅ Lock acquired
User 2 ──┤→ Verify seat → Redis NX ─┤
User 3 ──┘                           └──→ ❌ Lock conflict (409 Conflict)
```

**Key Points:**
- All requests go to backend (no frontend caching)
- Redis SET with NX flag ensures atomicity
- Only ONE user can acquire the lock
- Lock includes TTL for auto-expiration

### Payment Processing Flow

```
1. Create Booking
   ├─ Lock seats in Redis
   ├─ Create Booking record (status: PAYMENT_PENDING)
   └─ Generate idempotency key

2. Initiate Payment
   ├─ Call payment provider
   └─ Store payment intent

3. Payment Provider Confirms
   ├─ Send webhook to backend
   ├─ Verify signature
   └─ Check idempotency key

4. Webhook Handler
   ├─ If new: Confirm booking, generate tickets
   ├─ If duplicate: Return cached result
   └─ Store payment record

5. Background Jobs
   ├─ Generate QR code
   ├─ Send confirmation email
   └─ Update analytics
```

### Real-Time Seat Updates

```
User A Books Seat → Backend processes → 
  Seat status changes → Broadcast via Socket.IO + Redis → 
  User B sees update immediately
```

## Scalability Architecture

### Horizontal Scaling

The system supports adding more backend instances without architectural changes:

```
New Request
    ↓
Load Balancer
    ├─→ Backend Instance 1
    ├─→ Backend Instance 2
    ├─→ Backend Instance 3
    └─→ Backend Instance N
```

**Stateless Design:**
- No session data stored locally
- All user state in JWT tokens
- Session data in Redis (shared)
- Database as single source of truth

### Database Scaling Patterns

**Sharding** (Future):
- Shard by event ID for hot events
- Separate collections for high-volume data

**Replication:**
- MongoDB replica set for high availability
- Read replicas for analytics queries

### Caching Strategy

```
User Request
    ↓
Redis (Popular events, categories)
    ├─ Cache HIT → Return immediately
    └─ Cache MISS → Query MongoDB → Update cache
```

## Security Architecture

### Authentication Flow

```
1. User Login
   ├─ Verify credentials
   └─ Issue JWT (short-lived) + Refresh token (HTTP-only cookie)

2. API Request
   ├─ Client sends JWT in Authorization header
   ├─ Middleware verifies JWT
   └─ Attach user to request

3. Token Refresh
   ├─ Client sends refresh token from cookie
   ├─ Backend verifies and issues new JWT
   └─ Return new JWT
```

### Rate Limiting

```
Request → Middleware → Redis counter → 
  ├─ Under limit → Process request
  └─ Over limit → 429 Too Many Requests
```

**Redis-backed** for consistency across instances.

## Reliability & Failure Handling

### Graceful Degradation

1. **Redis Down:**
   - Seat locking fails → Reject booking (safe)
   - Caching fails → Slow queries but functional
   - Socket.IO fails → No real-time updates but functional

2. **MongoDB Down:**
   - API returns 503 Service Unavailable
   - Connections pool retries
   - Client retries with exponential backoff

3. **Payment Provider Down:**
   - Booking transitions to PAYMENT_PENDING state
   - Background job retries payment verification
   - User can retry manually

### Data Consistency

**MongoDB Transactions** ensure consistency:

```javascript
// Atomic operation: All succeed or all rollback
db.transaction(session => {
  bookings.updateOne({ booking update }, { session });
  payments.insertOne({ payment record }, { session });
  tickets.insertOne({ ticket }, { session });
})
```

## Performance Optimization

### Query Optimization
- Indexes on frequently queried fields
- Aggregate pipelines for complex queries
- Pagination for large result sets

### Caching Layers
1. Browser cache (static assets)
2. Redis (session, popular data)
3. Database query cache (Mongoose)

### Connection Pooling
- MongoDB connection pool (default 10)
- Redis connection pool
- HTTP keep-alive for client connections

## Monitoring & Observability

### Request Tracing
- Unique request ID for every request
- Propagated through all services
- Logged for debugging

### Structured Logging
```json
{
  "timestamp": "2024-09-04T12:34:56Z",
  "requestId": "req_123",
  "userId": "user_456",
  "method": "POST",
  "path": "/api/bookings",
  "status": 201,
  "latency": 245,
  "message": "Booking created successfully"
}
```

### Metrics to Monitor
- Request latency (p50, p95, p99)
- Error rate
- Concurrent connections
- Redis memory usage
- MongoDB query times
- Job queue length

## Next Phases

- **Phase 2:** Authentication & RBAC
- **Phase 3:** Events & Seat Management
- **Phase 4:** Core Booking with Redis Locking
- **Phase 5:** Payment System
- **Phase 6:** Tickets & QR Codes
- **Phase 7:** Real-time Updates
- **Phase 8:** Background Jobs
- **Phase 9:** Advanced Features (Coupons, Refunds)
- **Phase 10:** Dashboards & Analytics
