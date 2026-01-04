const WebSocket = require("ws");
const request = require("supertest");
const { server, initWebSocket } = require("../../server");

// --- Helper: wait for a specific WS event ---
function waitForEvent(ws, eventName, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for event: ${eventName}`));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      ws.off("message", onMessage);
      ws.off("error", onError);
      ws.off("close", onClose);
    }

    function onError(err) {
      cleanup();
      reject(err);
    }

    function onClose() {
      cleanup();
      reject(new Error("WebSocket closed before receiving expected event"));
    }

    function onMessage(raw) {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (e) {
        // Ignore non-JSON messages
        return;
      }

      if (msg && msg.event === eventName) {
        cleanup();
        resolve(msg);
      }
    }

    ws.on("message", onMessage);
    ws.on("error", onError);
    ws.on("close", onClose);
  });
}

describe("WebSocket events", () => {
  let baseUrl;
  let ws;

  beforeAll(async () => {
    initWebSocket();
    // Start server on ephemeral port
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    if (ws) {
    try { ws.terminate(); } catch (_) {}
    }
    await new Promise((resolve) => server.close(resolve));
  });

  test("connects to WS and receives CONNECTED", async () => {
  ws = new WebSocket(baseUrl.replace("http", "ws"));

  // Start listening for CONNECTED immediately (prevents missing fast messages)
  const connectedPromise = waitForEvent(ws, "CONNECTED", 5000);

  await new Promise((resolve, reject) => {
    ws.on("open", resolve);
    ws.on("error", reject);
  });

  const connectedMsg = await connectedPromise;
  expect(connectedMsg.data).toBeDefined();
  expect(connectedMsg.data.message).toMatch(/connected/i);
});


  test("emits USER_CREATED when a user is created", async () => {
    // Ensure ws exists and open
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      ws = new WebSocket(baseUrl.replace("http", "ws"));
      await new Promise((resolve, reject) => {
        ws.on("open", resolve);
        ws.on("error", reject);
      });
      await waitForEvent(ws, "CONNECTED", 5000);
    }

    const wait = waitForEvent(ws, "USER_CREATED", 5000);

    const res = await request(baseUrl)
      .post("/api/users")
      .send({ name: "WS User", email: `wsuser_${Date.now()}@test.com` })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    const msg = await wait;

    expect(msg.data).toBeDefined();
    expect(msg.data.id).toBeDefined();
    expect(msg.data.email).toContain("@");
  });

  test("emits ORDER_STATUS_CHANGED when order status changes", async () => {
    // Create a user
    const userRes = await request(baseUrl)
      .post("/api/users")
      .send({ name: "Order User", email: `orderuser_${Date.now()}@test.com` })
      .set("Content-Type", "application/json");
    expect(userRes.status).toBe(201);
    const userId = userRes.body.data.id;

    // Create an order
    const orderRes = await request(baseUrl)
      .post("/api/orders")
      .send({ userId, status: "PENDING" })
      .set("Content-Type", "application/json");
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data.id;

    // Wait for WS event while updating status
    const wait = waitForEvent(ws, "ORDER_STATUS_CHANGED", 5000);

    const updateRes = await request(baseUrl)
      .put(`/api/orders/${orderId}/status`)
      .send({ status: "SHIPPED" })
      .set("Content-Type", "application/json");
    expect(updateRes.status).toBe(200);

    const msg = await wait;
    expect(msg.data.orderId).toBe(orderId);
    expect(msg.data.userId).toBe(userId);
    expect(msg.data.oldStatus).toBe("PENDING");
    expect(msg.data.newStatus).toBe("SHIPPED");
  });
});