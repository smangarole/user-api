const express = require("express");

function createOrdersRouter({ usersStore, ordersStore, broadcast, errorResponse }) {
  const router = express.Router();

  router.get("/", (req, res) => {
    return res.status(200).json({ success: true, data: ordersStore.orders });
  });

  router.post("/", (req, res) => {
    const { userId, status } = req.body || {};

    if (!Number.isInteger(userId) || userId <= 0) {
      return errorResponse(res, 400, "userId must be a positive integer.");
    }

    const userExists = usersStore.users.some((u) => u.id === userId);
    if (!userExists) {
      return errorResponse(res, 404, `User with id ${userId} not found.`);
    }

    const allowed = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
    const finalStatus = status || "PENDING";
    if (!allowed.includes(finalStatus)) {
      return errorResponse(res, 400, `Invalid status. Allowed: ${allowed.join(", ")}`);
    }

    const order = {
      id: ordersStore.nextOrderId++,
      userId,
      status: finalStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    ordersStore.orders.push(order);
    return res.status(201).json({ success: true, data: order });
  });

  router.put("/:id/status", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return errorResponse(res, 400, "Invalid order id. Must be a positive integer.");
    }

    const { status } = req.body || {};
    const allowed = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
    if (!allowed.includes(status)) {
      return errorResponse(res, 400, `Invalid status. Allowed: ${allowed.join(", ")}`);
    }

    const order = ordersStore.orders.find((o) => o.id === id);
    if (!order) {
      return errorResponse(res, 404, `Order with id ${id} not found.`);
    }

    const oldStatus = order.status;
    order.status = status;
    order.updatedAt = new Date().toISOString();

    broadcast("ORDER_STATUS_CHANGED", {
      orderId: order.id,
      userId: order.userId,
      oldStatus,
      newStatus: status,
    });

    return res.status(200).json({ success: true, data: order });
  });

  return router;
}

module.exports = { createOrdersRouter };
