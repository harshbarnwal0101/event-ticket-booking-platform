# Concurrency & Race Condition Prevention

## The Challenge: Double-Booking

In a high-concurrency system where thousands of users simultaneously book seats, the **#1 critical requirement** is preventing double-booking: only ONE user can successfully book a specific seat.

### The Naive Approach (WRONG ❌)

```typescript
// This WILL have race conditions!
async function bookSeat(seatId, userId) {
  const seat = await db.seats.findById(seatId);
  
  if (seat.available) {                    // ← Check
    // ... wait for network/processing ...
    seat.available = false;                // ← Act (Race condition window!)
    seat.bookedBy = userId;
    await db.seats.save(seat);
  }
}
```

**Why it fails:**
```
Time 0.000ms: User A reads seat.available = true
Time 0.005ms: User B reads seat.available = true      ← Race condition!
Time 0.010ms: User A writes seat.bookedBy = A
Time 0.015ms: User B writes seat.bookedBy = B         ← Double-booking!
```

Both users see the seat as available, both proceed to book, and both succeed. **DISASTER**.

## The Solution: Atomic Locks with Redis

### How It Works

Redis provides an **atomic SET with NX (Not eXists) flag**:

```
SET key value NX EX 300
```

- **NX**: Only set if key does NOT exist (atomic check-and-set)
- **EX**: Expire key after 300 seconds (auto-cleanup)
- **Atomic**: No race condition possible

### Correct Implementation

```typescript
async function lockSeat(eventId, seatId, userId) {
  const lockKey = `event:${eventId}:seat:${seatId}`;
  const lockValue = {
    userId,
    lockId: generateLockId(),
    timestamp: Date.now(),
  };

  // Atomic operation - only ONE will succeed
  const acquired = await redis.set(
    lockKey,
    JSON.stringify(lockValue),
    'NX',        // Only if NOT exists
    'EX', 300    // Expire in 5 minutes
  );

  if (acquired) {
    return { success: true, lockId: lockValue.lockId };
  } else {
    return { success: false, error: 'Seat already locked' };
  }
}
```

### Race Condition Eliminated

```
Time 0.000ms: User A SET lockKey NX → SUCCESS (1 returned)
Time 0.005ms: User B SET lockKey NX → FAILED (0 returned)
                                     
Only User A can proceed!
```

**Guaranteed atomicity** - Redis handles everything in a single operation.

## Lock Lifecycle

### State Transitions

```
┌─────────┐
│AVAILABLE│ (Initial state)
└────┬────┘
     │ User requests lock
     ▼
┌───────┐
│LOCKED │ (TTL: 5 minutes)
└────┬──┬──────────────────┐
     │  │                  │
     │  │ Expire (auto)    │ Payment fails
     │  │                  │
     ▼  ▼                  ▼
┌──────────┐          ┌──────────┐
│AVAILABLE │          │AVAILABLE │
└──────────┘          └──────────┘
     ▲                     (Released)
     │
     │ User completes payment
     │ & booking confirmed
     │
┌─────────┐
│ BOOKED  │ (Permanent)
└─────────┘
```

## Lock Ownership Verification

### Preventing Unauthorized Release

A user can't release someone else's lock:

```typescript
async function releaseLock(eventId, seatId, lockId) {
  const lockKey = `event:${eventId}:seat:${seatId}`;
  
  // Get current lock value
  const currentLock = await redis.get(lockKey);
  
  if (!currentLock) {
    return { success: false, error: 'Lock not found' };
  }

  const lock = JSON.parse(currentLock);
  
  // Verify ownership
  if (lock.lockId !== lockId) {
    return { success: false, error: 'Lock ownership mismatch' };
  }

  // Only owner can delete
  await redis.del(lockKey);
  return { success: true };
}
```

## Lock Expiration Strategy

### Why TTL is Critical

Without TTL, a user could:
1. Lock a seat
2. Close browser without completing payment
3. Seat remains locked forever ❌

With TTL:
1. Lock seat (5 minute TTL)
2. Close browser
3. Lock auto-expires after 5 minutes ✅

### Expiration Timeline

```
Lock acquired at 12:00:00
    │
    ├─ 12:00:00 to 12:05:00 → Seat is LOCKED
    │
    ├─ 12:04:50 → Still locked (10 seconds left)
    │
    ├─ 12:05:00 → TTL expires, Redis auto-deletes key
    │
    └─ 12:05:01 → Seat is AVAILABLE again (another user can lock)
```

### Extending Lock for Slow Payments

If payment takes longer than 5 minutes:

```typescript
async function extendLock(eventId, seatId, lockId) {
  const lockKey = `event:${eventId}:seat:${seatId}`;
  const currentLock = await redis.get(lockKey);
  
  if (!currentLock) {
    return { success: false, error: 'Lock expired' };
  }

  const lock = JSON.parse(currentLock);
  if (lock.lockId !== lockId) {
    return { success: false, error: 'Lock ownership mismatch' };
  }

  // Reset TTL
  await redis.expire(lockKey, 300); // 5 more minutes
  return { success: true };
}
```

## Concurrency Test Scenario

### The Critical Test

Test case: **100 simultaneous users trying to book the SAME seat**

```typescript
async function testConcurrency() {
  const eventId = 'event_123';
  const seatId = 'seat_456';
  
  // Simulate 100 concurrent requests
  const promises = Array(100).fill(null).map(() => 
    lockSeat(eventId, seatId, `user_${Math.random()}`)
  );
  
  const results = await Promise.all(promises);
  
  // Count successes
  const successes = results.filter(r => r.success).length;
  
  console.assert(successes === 1, 
    `Expected 1 success, got ${successes}`
  );
  // 99 failures, 1 success = PERFECT ✅
}
```

**Expected Result:**
- Exactly 1 lock acquisition succeeds
- 99 lock acquisitions fail with 409 Conflict
- No double-booking is possible

## Why NOT Rely on Database Unique Indexes

Some might suggest:

```typescript
// WRONG - Still has a race condition!
async function bookSeat(seatId, userId) {
  try {
    await db.seats.updateOne(
      { _id: seatId, bookedBy: null },
      { $set: { bookedBy: userId } }
    );
  } catch (e) {
    if (e.code === 11000) { // Unique constraint
      throw new Error('Already booked');
    }
  }
}
```

**Problems:**
1. Still checks then updates (time gap for race condition)
2. Database is slower than Redis
3. Multiple database writes needed for booking flow
4. Can't extend lock easily
5. Payment verification happens AFTER lock, so database constraint alone isn't enough

## Complete Booking Flow with Locking

```
1. SELECT SEAT
   User selects seat on frontend

2. LOCK SEAT (Redis)
   POST /api/events/:eventId/seats/lock
   ├─ Redis SET with NX → Atomic
   └─ Only ONE user gets lock ✅

3. VERIFY LOCK
   ├─ Backend confirms lock ownership
   └─ Frontend shows seat as "locked by you"

4. INITIATE PAYMENT
   ├─ Lock status: LOCKED
   ├─ Create booking: PAYMENT_PENDING
   └─ Redirect to payment provider

5. PAYMENT PROVIDER CONFIRMS
   └─ Send webhook to backend

6. WEBHOOK HANDLER
   ├─ Verify payment signature
   ├─ Check idempotency (prevent duplicates)
   ├─ Update booking: CONFIRMED
   ├─ Update seat: BOOKED (in MongoDB)
   └─ Delete lock from Redis (cleanup)

7. BACKGROUND JOBS
   ├─ Generate ticket with QR
   ├─ Send confirmation email
   └─ Update analytics

8. LOCK EXPIRATION (Fallback)
   ├─ If payment fails/timeout
   ├─ Lock TTL expires
   └─ Seat available for other users again
```

## Handling Lock Expiration

### Background Job for Cleanup

```typescript
// BullMQ job: Cleanup expired locks
queue.process('cleanup-expired-locks', async () => {
  // Find bookings stuck in PAYMENT_PENDING
  const expiredBookings = await bookings.find({
    status: 'PAYMENT_PENDING',
    createdAt: { $lt: Date.now() - 5 * 60 * 1000 } // Older than 5 min
  });

  for (const booking of expiredBookings) {
    // Release locks and mark booking as expired
    for (const seat of booking.seats) {
      await redis.del(`event:${booking.eventId}:seat:${seat}`);
    }
    
    await bookings.updateOne(
      { _id: booking._id },
      { status: 'EXPIRED' }
    );
    
    // Notify user
    await jobs.queue('send-email', {
      to: booking.user.email,
      template: 'booking-expired'
    });
  }
});
```

## Monitoring Lock Health

### Metrics to Track

```typescript
async function monitorLocks() {
  // Total active locks
  const lockKeys = await redis.keys('event:*:seat:*');
  console.log(`Active seat locks: ${lockKeys.length}`);

  // Locks per event
  const eventLocks = {};
  for (const key of lockKeys) {
    const eventId = key.split(':')[1];
    eventLocks[eventId] = (eventLocks[eventId] || 0) + 1;
  }
  console.log('Locks by event:', eventLocks);

  // Alert if too many active locks (possible bot attack)
  if (lockKeys.length > LOCK_THRESHOLD) {
    alert('Potential seat hoarding detected!');
  }
}
```

## Bot/Seat Hoarding Protection

### Limit Concurrent Locks per User

```typescript
async function lockSeat(eventId, seatId, userId) {
  // Count user's active locks
  const userLocks = await redis.keys(`event:*:seat:*`);
  const userLockCount = userLocks.filter(k => {
    const lock = redis.get(k);
    return lock.userId === userId;
  }).length;

  if (userLockCount >= MAX_CONCURRENT_LOCKS) {
    throw new Error('Too many active locks');
  }

  // Proceed with lock acquisition
  // ...
}
```

### Rate Limiting per Endpoint

```typescript
// Redis rate limit: 10 lock attempts per minute
const lockRateLimit = createRateLimiter('lock-seats', {
  max: 10,
  windowMs: 60000
});

app.post('/api/events/:eventId/seats/lock', 
  lockRateLimit,
  lockSeatHandler
);
```

## Conclusion

**Key Takeaways:**

1. **Always use atomic operations** for race-condition-critical sections
2. **Redis NX+EX** is the correct tool for distributed locks
3. **TTL prevents deadlocks** from abandoned locks
4. **Lock ownership** must be verified
5. **Test with high concurrency** (100+ simultaneous requests)
6. **Never trust frontend state** - always verify in backend
7. **Database alone isn't enough** - need fast, atomic locks

The seat locking mechanism is the **foundation of correctness** for the entire booking system.
