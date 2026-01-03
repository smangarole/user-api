const request = require("supertest");
const { app, __resetData } = require("../../server");

const { expectValidSchema } = require("./validator");
const {
  userResponseSchema,
  usersListResponseSchema,
  errorEnvelope,
} = require("./schemas");

describe("Users API – /api/users", () => {
  beforeEach(() => {
    // Reset in-memory DB before each test
    __resetData();
  });

  // -------------------------
  // POSITIVE TEST CASES
  // -------------------------

  test("POST /api/users → creates a user (201)", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Snehal", email: "snehal@test.com", age: 40 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    expectValidSchema(userResponseSchema, res.body, "userResponseSchema");
  });

  test("GET /api/users → returns users list (200)", async () => {
    // create one user
    await request(app)
      .post("/api/users")
      .send({ name: "User One", email: "one@test.com" });

    const res = await request(app).get("/api/users");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expectValidSchema(usersListResponseSchema, res.body, "usersListResponseSchema");
  });

  test("GET /api/users/:id → returns user by id (200)", async () => {
    const createRes = await request(app)
      .post("/api/users")
      .send({ name: "User Two", email: "two@test.com" });

    const userId = createRes.body.data.id;

    const res = await request(app).get(`/api/users/${userId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expectValidSchema(userResponseSchema, res.body);
  });

  test("PUT /api/users/:id → updates user (200)", async () => {
    const createRes = await request(app)
      .post("/api/users")
      .send({ name: "User Three", email: "three@test.com" });

    const userId = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/users/${userId}`)
      .send({ name: "User Three Updated" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("User Three Updated");

    expectValidSchema(userResponseSchema, res.body);
  });

  test("DELETE /api/users/:id → deletes user (200)", async () => {
    const createRes = await request(app)
      .post("/api/users")
      .send({ name: "User Four", email: "four@test.com" });

    const userId = createRes.body.data.id;

    const res = await request(app).delete(`/api/users/${userId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deleted/i);
  });

  // -------------------------
  // NEGATIVE / DATA-DRIVEN
  // -------------------------

  const negativeCases = [
    {
      name: "POST missing email",
      method: "post",
      url: "/api/users",
      body: { name: "Bad User" },
      status: 400,
    },
    {
      name: "POST invalid email",
      method: "post",
      url: "/api/users",
      body: { name: "Bad User", email: "not-an-email" },
      status: 400,
    },
    {
      name: "POST duplicate email",
      setup: async () => {
        await request(app)
          .post("/api/users")
          .send({ name: "Dup", email: "dup@test.com" });
      },
      method: "post",
      url: "/api/users",
      body: { name: "Dup2", email: "dup@test.com" },
      status: 400,
    },
    {
      name: "GET user with invalid id",
      method: "get",
      url: "/api/users/abc",
      status: 400,
    },
    {
      name: "GET user not found",
      method: "get",
      url: "/api/users/99999",
      status: 404,
    },
    {
      name: "PUT user not found",
      method: "put",
      url: "/api/users/99999",
      body: { name: "No One" },
      status: 404,
    },
    {
      name: "DELETE user not found",
      method: "delete",
      url: "/api/users/99999",
      status: 404,
    },
  ];

  test.each(negativeCases)("Negative: $name", async ({ setup, method, url, body, status }) => {
    if (setup) await setup();

    const res = await request(app)[method](url).send(body);

    expect(res.status).toBe(status);
    expect(res.body.success).toBe(false);

    expectValidSchema(errorEnvelope, res.body, "errorEnvelope");
  });
});