/**
 * JSON Schemas used for API response validation
 * Used by AJV in API automation tests
 */

/**
 * Common success envelope:
 * {
 *   success: true,
 *   data: <any>
 * }
 */
const successEnvelope = (dataSchema) => ({
  type: "object",
  required: ["success", "data"],
  additionalProperties: false,
  properties: {
    success: { type: "boolean", const: true },
    data: dataSchema,
  },
});

/**
 * Common error envelope:
 * {
 *   success: false,
 *   error: {
 *     message: string,
 *     details?: any
 *   }
 * }
 */
const errorEnvelope = {
  type: "object",
  required: ["success", "error"],
  additionalProperties: false,
  properties: {
    success: { type: "boolean", const: false },
    error: {
      type: "object",
      required: ["message"],
      additionalProperties: true,
      properties: {
        message: { type: "string" },
        details: {},
      },
    },
  },
};

/**
 * User object schema
 */
const userSchema = {
  type: "object",
  required: ["id", "name", "email", "createdAt", "updatedAt"],
  additionalProperties: false,
  properties: {
    id: { type: "integer" },
    name: { type: "string", minLength: 1 },
    email: { type: "string", format: "email" },
    age: { type: "integer", minimum: 0 },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

/**
 * Order object schema
 */
const orderSchema = {
  type: "object",
  required: ["id", "userId", "status", "createdAt", "updatedAt"],
  additionalProperties: false,
  properties: {
    id: { type: "integer" },
    userId: { type: "integer" },
    status: {
      type: "string",
      enum: ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"],
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

/**
 * Users list schema
 */
const usersListSchema = {
  type: "array",
  items: userSchema,
};

/**
 * Orders list schema
 */
const ordersListSchema = {
  type: "array",
  items: orderSchema,
};

/**
 * Wrapped response schemas
 */
const userResponseSchema = successEnvelope(userSchema);
const usersListResponseSchema = successEnvelope(usersListSchema);
const orderResponseSchema = successEnvelope(orderSchema);
const ordersListResponseSchema = successEnvelope(ordersListSchema);

module.exports = {
  // base envelopes
  successEnvelope,
  errorEnvelope,

  // core schemas
  userSchema,
  usersListSchema,
  orderSchema,
  ordersListSchema,

  // wrapped response schemas
  userResponseSchema,
  usersListResponseSchema,
  orderResponseSchema,
  ordersListResponseSchema,
};
