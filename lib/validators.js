/**
 * Small validation helpers extracted from server.js so they can be tested.
 */

/**
 * Check whether a value represents a positive integer.
 * Accepts numeric values or numeric strings (e.g. "3").
 * @param {any} value
 * @returns {boolean}
 */
function isPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

/**
 * Validate a user payload for create/update operations.
 * - When partial=false (create), `name` and `email` are required and validated.
 * - When partial=true (update), provided fields are validated but not required.
 * - Unknown fields are rejected to prevent unexpected data.
 *
 * @param {object} payload
 * @param {{partial?: boolean}} [opts]
 * @returns {{ok: boolean, message?: string, details?: any}}
 */
function validateUserPayload(payload, { partial = false } = {}) {
  const allowedFields = ["name", "email", "age"];
  const keys = Object.keys(payload || {});
  const unknownKeys = keys.filter((k) => !allowedFields.includes(k));

  if (unknownKeys.length) {
    return {
      ok: false,
      message: "Payload contains unknown fields.",
      details: { unknownFields: unknownKeys, allowedFields },
    };
  }

  const errors = {};

  if (!partial || "name" in payload) {
    if (typeof payload.name !== "string" || payload.name.trim().length < 2) {
      errors.name = "Name must be a string with at least 2 characters.";
    }
  }

  if (!partial || "email" in payload) {
    const email = payload.email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailRegex.test(email)) {
      errors.email = "Email must be a valid email address.";
    }
  }

  if ("age" in payload) {
    const age = payload.age;
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      errors.age = "Age must be an integer between 0 and 120.";
    }
  }

  if (Object.keys(errors).length) {
    return { ok: false, message: "Validation failed.", details: errors };
  }

  return { ok: true };
}

module.exports = { isPositiveInt, validateUserPayload };
