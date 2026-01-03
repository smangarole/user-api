const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isPositiveInt, validateUserPayload } = require('../../lib/validators');

test('isPositiveInt accepts positive integers and numeric strings', () => {
  assert.strictEqual(isPositiveInt(1), true);
  assert.strictEqual(isPositiveInt('3'), true);
  assert.strictEqual(isPositiveInt(0), false);
  assert.strictEqual(isPositiveInt(-1), false);
  assert.strictEqual(isPositiveInt('abc'), false);
});

test('validateUserPayload: valid create payload', () => {
  const res = validateUserPayload({ name: 'Alice', email: 'a@b.com', age: 25 }, { partial: false });
  assert.strictEqual(res.ok, true);
});

test('validateUserPayload: missing name/email on create', () => {
  const res = validateUserPayload({ name: '', email: 'bad' }, { partial: false });
  assert.strictEqual(res.ok, false);
  assert.ok(res.details && (res.details.name || res.details.email));
});

test('validateUserPayload: partial update with invalid age', () => {
  const res = validateUserPayload({ age: 200 }, { partial: true });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.details.age, 'Age must be an integer between 0 and 120.');
});

test('validateUserPayload: reject unknown fields', () => {
  const res = validateUserPayload({ foo: 'bar' }, { partial: true });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.message, 'Payload contains unknown fields.');
});
