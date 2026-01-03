const express = require("express");
const { isPositiveInt, validateUserPayload } = require("../lib/validators");

/**
 * Factory function so we can inject dependencies
 */
function createUsersRouter({ usersStore, broadcast, errorResponse }) {
  const router = express.Router();

  router.post("/", (req, res) => {
    const validation = validateUserPayload(req.body, { partial: false });
    if (!validation.ok) {
      return errorResponse(res, 400, validation.message, validation.details);
    }

    const exists = usersStore.users.some(
      (u) => u.email.toLowerCase() === req.body.email.toLowerCase()
    );
    if (exists) return errorResponse(res, 400, "Email already exists.");

    const newUser = {
      id: usersStore.nextId++,
      name: req.body.name.trim(),
      email: req.body.email.trim(),
      ...(req.body.age !== undefined ? { age: req.body.age } : {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    usersStore.users.push(newUser);
    broadcast("USER_CREATED", newUser);

    return res.status(201).json({ success: true, data: newUser });
  });

  router.get("/", (req, res) => {
    return res.status(200).json({ success: true, data: usersStore.users });
  });

  router.get("/:id", (req, res) => {
    if (!isPositiveInt(req.params.id)) {
      return errorResponse(res, 400, "Invalid user id. Must be a positive integer.");
    }

    const id = Number(req.params.id);
    const user = usersStore.users.find((u) => u.id === id);
    if (!user) return errorResponse(res, 404, `User with id ${id} not found.`);

    return res.status(200).json({ success: true, data: user });
  });

  router.put("/:id", (req, res) => {
    if (!isPositiveInt(req.params.id)) {
      return errorResponse(res, 400, "Invalid user id. Must be a positive integer.");
    }

    const validation = validateUserPayload(req.body, { partial: true });
    if (!validation.ok) {
      return errorResponse(res, 400, validation.message, validation.details);
    }

    const id = Number(req.params.id);
    const idx = usersStore.users.findIndex((u) => u.id === id);
    if (idx === -1) return errorResponse(res, 404, `User with id ${id} not found.`);

    if (req.body.email) {
      const exists = usersStore.users.some(
        (u) => u.id !== id && u.email.toLowerCase() === req.body.email.toLowerCase()
      );
      if (exists) return errorResponse(res, 400, "Email already exists.");
    }

    const existing = usersStore.users[idx];
    usersStore.users[idx] = {
      ...existing,
      ...(req.body.name !== undefined ? { name: req.body.name.trim() } : {}),
      ...(req.body.email !== undefined ? { email: req.body.email.trim() } : {}),
      ...(req.body.age !== undefined ? { age: req.body.age } : {}),
      updatedAt: new Date().toISOString(),
    };

    return res.status(200).json({ success: true, data: usersStore.users[idx] });
  });

  router.delete("/:id", (req, res) => {
    if (!isPositiveInt(req.params.id)) {
      return errorResponse(res, 400, "Invalid user id. Must be a positive integer.");
    }

    const id = Number(req.params.id);
    const idx = usersStore.users.findIndex((u) => u.id === id);
    if (idx === -1) return errorResponse(res, 404, `User with id ${id} not found.`);

    const deleted = usersStore.users.splice(idx, 1)[0];
    return res
      .status(200)
      .json({ success: true, message: "User deleted successfully.", data: deleted });
  });

  return router;
}

module.exports = { createUsersRouter };
