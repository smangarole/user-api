// tests/api/orders.api.test.js
const request = require("supertest");
const { app, __resetData } = require("../../server");
const { expectValidSchema } = require("./validator");
const {
  orderResponseSchema,
  ordersListResponseSchema,
  errorEnvelope,
} = require("./schemas");

describe("Orders API – /api/orders", () => {
  beforeEach(() => {
    __resetData();
  });

  // Helper to create a user (orders require existing userId)
  async function createUser(overrides = {}) {
    const payload = {
      name: "Order User",
      email: `order_user_${Date.now()}@test.com`,
      ...overrides,
    };

    const res = await request(app).post("/api/users").send(payload);
    expect(res.status).toBe(201);
    return res.body.data;
  }

  // -------------------------
  // POSITIVE TEST CASES
  // -------------------------

  test("GET /api/orders → returns empty list initially (200)", async () => {
    const res = await request(app).get("/api/orders");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expectValidSchema(ordersListResponseSchema, res.body, "ordersListResponseSchema");
    expect(res.body.data).toEqual([]);
  });

  test("POST /api/orders → creates an order (201) + schema", async () => {
    const user = await createUser();

    const res = await request(app)
      .post("/api/orders")
      .send({ userId: user.id, status: "PENDING" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    expectValidSchema(orderResponseSchema, res.body, "orderResponseSchema");
    expect(res.body.data.userId).toBe(user.id);
    expect(res.body.data.status).toBe("PENDING");
  });

  test("PUT /api/orders/:id/status → updates order status (200) + schema", async () => {
    const user = await createUser();

    const createOrderRes = await request(app)
      .post("/api/orders")
      .send({ userId: user.id, status: "PENDING" });

    expect(createOrderRes.status).toBe(201);
    const orderId = createOrderRes.body.data.id;

    const res = await request(app)
      .put(`/api/orders/${orderId}/status`)
      .send({ status: "SHIPPED" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expectValidSchema(orderResponseSchema, res.body, "orderResponseSchema");
    expect(res.body.data.status).toBe("SHIPPED");
  });

  test("GET /api/orders → returns list after creation (200) + schema", async () => {
    const user = await createUser();

    await request(app)
      .post("/api/orders")
      .send({ userId: user.id, status: "CONFIRMED" });

    const res = await request(app).get("/api/orders");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expectValidSchema(ordersListResponseSchema, res.body, "ordersListResponseSchema");
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].userId).toBe(user.id);
    expect(res.body.data[0].status).toBe("CONFIRMED");
  });

  // -------------------------
  // NEGATIVE / DATA-DRIVEN
  // -------------------------

  const negativeCases = [
    {
      name: "POST /api/orders missing body",
      method: "post",
      url: "/api/orders",
      body: undefined,
      status: 400,
    },
    {
      name: "POST /api/orders userId not integer",
      method: "post",
      url: "/api/orders",
      body: { userId: "1", status: "PENDING" },
      status: 400,
    },
    {
      name: "POST /api/orders userId not found",
      method: "post",
      url: "/api/orders",
      body: { userId: 999999, status: "PENDING" },
      status: 404,
    },
    {
      name: "POST /api/orders invalid status",
      method: "post",
      url: "/api/orders",
      // userId will be injected via setup
      setup: async () => {
        const user = await createUser({ email: `st_${Date.now()}@test.com` });
        return { userId: user.id };
      },
      body: { status: "UNKNOWN" },
      status: 400,
    },
    {
      name: "PUT /api/orders/:id/status invalid order id (non-int)",
      method: "put",
      url: "/api/orders/abc/status",
      body: { status: "SHIPPED" },
      status: 400,
    },
    {
      name: "PUT /api/orders/:id/status invalid status",
      method: "put",
      // orderId injected by setup
      setup: async () => {
        const user = await createUser({ email: `inv_${Date.now()}@test.com` });
        const orderRes = await request(app)
          .post("/api/orders")
          .send({ userId: user.id, status: "PENDING" });
        const orderId = orderRes.body.data.id;
        return { url: `/api/orders/${orderId}/status` };
      },
      body: { status: "NOT_A_STATUS" },
      status: 400,
    },
    {
      name: "PUT /api/orders/:id/status order not found",
      method: "put",
      url: "/api/orders/999999/status",
      body: { status: "SHIPPED" },
      status: 404,
    },
  ];

  test.each(negativeCases)("Negative: $name", async (tc) => {
    const { setup, method, status } = tc;

    let url = tc.url;
    let body = tc.body;

    // Setup can inject dynamic url and/or body fields (e.g., real userId)
    if (setup) {
      const injected = await setup();
      if (injected?.url) url = injected.url;
      if (injected?.userId) body = { ...body, userId: injected.userId };
    }

    // For "missing body" case, don't call .send(undefined) (supertest handles but keep explicit)
    const req = request(app)[method](url);
    const res = body === undefined ? await req : await req.send(body);

    expect(res.status).toBe(status);
    expect(res.body.success).toBe(false);

    // NOTE:
    // This expects your orders endpoints to use the SAME error envelope as users.
    // If your current orders code still returns inline errors, either:
    //  - update orders routes to use errorResponse(), OR
    //  - relax this check for orders.
    expectValidSchema(errorEnvelope, res.body, "errorEnvelope");
  });
});