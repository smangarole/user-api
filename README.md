# user-api

A small HTTP + WebSocket server. This document summarizes the available HTTP endpoints and the WebSocket events the server emits. Below you will find runnable cURL examples for every HTTP endpoint.

---

## Table of Contents

- Features
- Architecture
- Project Structure
- Run Locally
- HTTP API
- WebSocket Events
- Testing Strategy
- Notes & Limitations

---

## Features

- RESTful APIs for Users and Orders
- Input validation with meaningful error responses
- Real-time WebSocket events:
  - USER_CREATED
  - ORDER_STATUS_CHANGED
- In-memory data store (no external DB)
- Comprehensive automation:
  - Unit tests (Node native test runner)
  - API tests (Jest + Supertest + AJV)
  - WebSocket tests (Jest + ws client)

---

## Architecture

### High-Level Architecture

    +-------------------+
    |   Client / Test   |
    | (REST / WS)       |
    +---------+---------+
              |
              | HTTP (REST)
              v
    +-------------------+
    |   Express App     |
    |-------------------|
    |  /api/users       |
    |  /api/orders      |
    +---------+---------+
              |
              | emits events
              v
    +-------------------+
    | WebSocket Server  |
    | (same HTTP port)  |
    +-------------------+

---

### Request Flow (REST)

    Client
      |
      | HTTP Request
      v
    Express App (server.js)
      |
      |--> Users Router (/api/users)
      |--> Orders Router (/api/orders)
              |
              v
       In-Memory Store

---

### WebSocket Event Flow

    Client (WS connected)
            ^
            |
    WebSocket Server
            ^
            |
    REST API Action
    (POST /api/users,
     PUT /api/orders/:id/status)

Events are emitted asynchronously after successful REST operations.

---

## Project Structure

    user-api/
    ├─ routes/
    │  ├─ users.routes.js
    │  └─ orders.routes.js
    ├─ lib/
    │  └─ validators.js
    ├─ test/
    │  ├─ unit/
    │  ├─ api/
    │  └─ ws/
    ├─ server.js
    ├─ package.json
    └─ README.md

---

## Run locally

1. Install dependencies (if any are listed in package.json):

```bash
npm install
```

2. Start the server:

```bash
npm start
```

By default the server listens on port 3000 (use `PORT` env to change).

## HTTP API (JSON)

Base path: `/api`

All requests that include a JSON body must send the header `Content-Type: application/json`.

### Users

1) Create user — POST /api/users

```bash
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{ "name": "Alice Example", "email": "alice@example.com", "age": 30 }'
```

Sample successful response (201):

```json
{ "success": true, "data": { "id": 1, "name": "Alice Example", "email": "alice@example.com", "age": 30, "createdAt": "...", "updatedAt": "..." } }
```

2) List users — GET /api/users

```bash
curl -s http://localhost:3000/api/users
```

Sample response (200):

```json
{ "success": true, "data": [ /* users */ ] }
```

3) Get user by id — GET /api/users/:id

```bash
curl -s http://localhost:3000/api/users/1
```

4) Update user (partial) — PUT /api/users/:id

```bash
curl -s -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{ "name": "Alice New", "age": 31 }'
```

5) Delete user — DELETE /api/users/:id

```bash
curl -s -X DELETE http://localhost:3000/api/users/1
```

Errors use a consistent shape: `{ success: false, error: { message, details? } }`

### Orders

1) Create order — POST /api/orders

Create an order for an existing user (replace userId with a valid user id):

```bash
curl -s -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{ "userId": 1, "status": "PENDING" }'
```

Sample response (201):

```json
{ "success": true, "data": { "id": 1, "userId": 1, "status": "PENDING", "createdAt": "...", "updatedAt": "..." } }
```

2) Update order status — PUT /api/orders/:id/status

```bash
curl -s -X PUT http://localhost:3000/api/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "SHIPPED" }'
```

3) List orders — GET /api/orders

```bash
curl -s http://localhost:3000/api/orders
```

### Error Format
```bash
    {
      "success": false,
      "error": {
        "message": "Error message",
        "details": {}
      }
    }
```

## WebSocket (events)

The server runs a WebSocket server on the same port. Connect to:

```
ws://localhost:3000
```

On connect the server sends a CONNECTED event:

```json
{
  "event": "CONNECTED",
  "data": { "message": "WebSocket connected" },
  "timestamp": "2026-01-03T..."
}
```

Events the server emits (examples):

- `USER_CREATED` — emitted after a successful POST /api/users
  - data: the newly created user object

- `ORDER_STATUS_CHANGED` — emitted when an order status is updated
  - data: { orderId, userId, oldStatus, newStatus }

All messages follow the shape:

```json
{ "event": string, "data": any, "timestamp": string }
```

## Notes

- This server uses an in-memory store for users and orders; data is not persistent.
- Validation errors and other failures return HTTP error responses with a consistent structure.

## Error examples (cURL)

The server returns errors in the shape: `{ success: false, error: { message, details? } }`.
Below are common error scenarios and example requests.

1) Create user — invalid email

```bash
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{ "name": "Bob", "email": "not-an-email" }'
```

Expected response (400):

```json
{
  "success": false,
  "error": {
    "message": "Validation failed.",
    "details": { "email": "Email must be a valid email address." }
  }
}
```

2) Create user — duplicate email

First, create a user with an email; then run:

```bash
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{ "name": "Alice", "email": "alice@example.com" }'
```

Expected response (400):

```json
{ "success": false, "error": { "message": "Email already exists." } }
```

3) Get user — invalid id (non-positive or non-integer)

```bash
curl -s http://localhost:3000/api/users/abc
```

Expected response (400):

```json
{ "success": false, "error": { "message": "Invalid user id. Must be a positive integer." } }
```

4) Get user — not found

```bash
curl -s http://localhost:3000/api/users/9999
```

Expected response (404):

```json
{ "success": false, "error": { "message": "User with id 9999 not found." } }
```

5) Create order — invalid userId (not positive integer)

```bash
curl -s -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{ "userId": "x" }'
```

Expected response (400):

```json
{ "success": false, "error": { "message": "userId must be a positive integer." } }
```

6) Create order — user not found

```bash
curl -s -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{ "userId": 9999 }'
```

Expected response (404):

```json
{ "success": false, "error": { "message": "User with id 9999 not found." } }
```

7) Create order / Update order status — invalid status

```bash
curl -s -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{ "userId": 1, "status": "BAD" }'
```

Expected response (400):

```json
{ "success": false, "error": { "message": "Invalid status. Allowed: PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED" } }
```

8) Update order status — order not found

```bash
curl -s -X PUT http://localhost:3000/api/orders/9999/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "CONFIRMED" }'
```

Expected response (404):

```json
{ "success": false, "error": { "message": "Order with id 9999 not found." } }
```

9) Delete user — not found

```bash
curl -s -X DELETE http://localhost:3000/api/users/9999
```

Expected response (404):

```json
{ "success": false, "error": { "message": "User with id 9999 not found." } }
```

## Run tests:

### Run Unit Tests
```bash
npm run test:unit
```

### Run API Tests
```bash
npm run test:api
```

### Run WebSocket Tests
```bash
npm run test:ws
```

### Run All Tests
```bash
npm run test:all
```