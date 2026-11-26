# VELOMAX Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Strict Owner Isolation (PII)**: `/users/{userId}` contains PII (`email`, `birthDate`, `name`). Only the authenticated user whose `request.auth.uid == userId` may `get`, `create`, `update`, or `delete` their own profile document. Collection-wide `list` on `/users` is strictly denied (`allow list: if false`).
2. **Parent-Child Relational Integrity**: Every `/users/{userId}/measurements/{measurementId}` document must belong to an existing `/users/{userId}` document (`exists(...) && get(...).data.uid == request.auth.uid` on single-doc create/update/delete), and its internal `userId` must equal `userId` and `request.auth.uid`, and `id` must equal `measurementId`.
3. **Immutability & Temporal Integrity**: `uid`, `userId`, `id`, and `createdAt` cannot be modified after creation. `createdAt` and `updatedAt` must strictly equal `request.time` (serverTimestamp).
4. **Query Enforcer**: `allow list` on `/users/{userId}/measurements` forbids `get()`/`exists()` and enforces `isOwner(userId) && existing().userId == request.auth.uid`.
5. **Bounded Arrays & Strings**: Every string has explicit `.size()` bounds; `points` must have exact size `3` with valid positive numeric bounds; `attachedVideoNames` must be a list of size `<= 3`.

## 2. "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Profile Read**: Unauthenticated client runs `getDoc(doc(db, 'users', 'uidA'))`.
2. **Cross-User PII Read**: Authenticated `uidB` runs `getDoc(doc(db, 'users', 'uidA'))`.
3. **Users Collection Enumeration**: Authenticated `uidA` runs `getDocs(collection(db, 'users'))`.
4. **Shadow Field Injection on Signup**: `uidA` creates `/users/uidA` with extra ghost field `isAdmin: true`.
5. **UID Spoofing on Profile Create**: `uidB` creates `/users/uidB` with `uid: 'uidA'`.
6. **Client Timestamp Forgery**: `uidA` creates `/users/uidA` with client-supplied `createdAt: '2020-01-01'` instead of `serverTimestamp()`.
7. **Immutable Field Tampering**: `uidA` updates `/users/uidA` attempting to alter `uid` or `createdAt`.
8. **Orphaned Measurement Write**: `uidA` creates `/users/uidA/measurements/m-1` when `/users/uidA` parent document does not exist.
9. **Cross-User Measurement Injection**: `uidB` creates `/users/uidA/measurements/m-2` or creates `/users/uidB/measurements/m-2` with `userId: 'uidA'`.
10. **Path ID Poisoning**: `uidA` attempts write to `/users/uidA/measurements/bad$id..1500chars`.
11. **Unbounded Array / Payload Exhaustion**: `uidA` creates measurement with `points` length `50` or `attachedVideoNames` length `20`.
12. **Unconstrained List Query Scraping**: `uidB` queries `collection(db, 'users', 'uidA', 'measurements')` or omits `where('userId', '==', uidB)`.
