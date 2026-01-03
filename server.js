const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const { createUsersRouter } = require("./routes/users.routes");
const { createOrdersRouter } = require("./routes/orders.routes");

const app = express();
app.use(express.json());
const server = http.createServer(app);

// WebSocket server on the same HTTP server/port
const wss = new WebSocketServer({ server });

/**
 * Broadcast a JSON-wrapped event to all connected WebSocket clients.
 * @param {string} event
 * @param {any} data
 */
function broadcast(event, data) {
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(message);
  });
}

wss.on("connection", (ws) => {
  ws.send(
    JSON.stringify({ event: "CONNECTED", data: { message: "WebSocket connected" }, timestamp: new Date().toISOString() })
  );
  ws.on("error", console.error);
});

// ---- In-memory stores (simple, non-persistent) ----
const usersStore = {
  users: [],
  nextId: 1,
};

const ordersStore = {
  orders: [],
  nextOrderId: 1,
};

/**
 * Test helper: reset all in-memory data.
 * Keeps API automation deterministic (no flaky tests due to leftover state).
 * Exported as __resetData for tests.
 */
function __resetData() {
  usersStore.users = [];
  usersStore.nextId = 1;

  ordersStore.orders = [];
  ordersStore.nextOrderId = 1;
}

/**
 * Send a standard JSON error response.
 *
 * This helper centralizes error responses so all errors follow the same shape:
 * { success: false, error: { message, details? } }
 *
 * @param {import('express').Response} res - Express response object.
 * @param {number} status - HTTP status code to send.
 * @param {string} message - Short error message for clients.
 * @param {any} [details] - Optional additional error details (validation errors, etc.).
 * @returns {import('express').Response} The response returned by Express.
 */
function errorResponse(res, status, message, details = undefined) {
  const payload = {
    success: false,
    error: {
      message,
      ...(details ? { details } : {}),
    },
  };
  return res.status(status).json(payload);
}

// --------------------
// Mount Routers
// --------------------
app.use(
  "/api/users",
  createUsersRouter({
    usersStore,
    broadcast,
    errorResponse,
  })
);

app.use(
  "/api/orders",
  createOrdersRouter({
    usersStore,
    ordersStore,
    broadcast,
    errorResponse,
  })
);

// ---- Global 404 (unknown route) ----
app.use((req, res) => errorResponse(res, 404, "Route not found."));

// ---- Global error handler (500) ----
app.use((err, req, res, next) => {
  console.error(err);
  return errorResponse(res, 500, "Internal server error.");
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  server.listen(PORT, () => console.log(`HTTP + WS running on http://localhost:${PORT}`));
}

module.exports = { app, server, __resetData, broadcast };
