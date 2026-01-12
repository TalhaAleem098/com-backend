const router = require("express").Router();
const orderModel = require("../../models/order.models");

router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    if (limit < 1 || page < 1 || limit > 100 || isNaN(limit) || isNaN(page)) {
      return res.status(400).json({ error: "Invalid pagination parameters" });
    }

    const query = { isDeleted: false };
    if (status) {
      query.status = status;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const orders = await orderModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("items.product", "name price images")
      .populate("items.vendor", "name")
      .populate("statusHistory.changedBy", "name");

    const totalOrders = await orderModel.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limitNum);

    const ordersWithDetails = orders.map((order) => ({
      ...order.toObject(),
      paymentVerified:
        order.paymentStatus === "paid" && !!order.paymentIntentId,
      transactionId: order.paymentIntentId || null,
      orderNumber: order.orderNumber,
    }));

    res.json({
      orders: ordersWithDetails,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalOrders,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.log("Error fetching orders:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
