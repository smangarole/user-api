// tests/api/validator.js
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

/**
 * AJV instance for validating API response schemas.
 * - allErrors: gives all schema errors (not just first)
 * - strict: false avoids strict-mode failures for common patterns in small projects
 */
const ajv = new Ajv({
  allErrors: true,
  strict: false,
});

addFormats(ajv);

/**
 * Validates `data` against `schema`.
 * Throws a readable error if schema validation fails.
 *
 * @param {object} schema - JSON schema object
 * @param {any} data - data to validate
 * @param {string} [label] - optional label to show in error output
 */
function expectValidSchema(schema, data, label = "schema") {
  const validate = ajv.compile(schema);
  const ok = validate(data);

  if (!ok) {
    const details = JSON.stringify(validate.errors, null, 2);
    throw new Error(`Schema validation failed (${label}):\n${details}\n\nData:\n${JSON.stringify(data, null, 2)}`);
  }
}

module.exports = {
  ajv,
  expectValidSchema,
};
