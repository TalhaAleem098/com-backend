const router = require("express").Router();
const mongoose = require("mongoose");
const orderModel = require("../../models/order.models");

router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      paymentMethod,
      dateRange,
      minTotal,
      maxTotal,
    } = req.query;

    if (limit < 1 || page < 1 || limit > 100 || isNaN(limit) || isNaN(page)) {
      return res.status(400).json({ error: "Invalid pagination parameters" });
    }

    const query = { isDeleted: false };

    // Status filter
    if (status) {
      query.status = status;
    }

    // Payment status filter
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    // Payment method filter
    if (paymentMethod) {
      query.paymentMethod = { $regex: paymentMethod, $options: "i" };
    }

    // Total amount filters
    if (minTotal && !isNaN(minTotal)) {
      query.grandTotal = { ...query.grandTotal, $gte: parseFloat(minTotal) };
    }
    if (maxTotal && !isNaN(maxTotal)) {
      query.grandTotal = { ...query.grandTotal, $lte: parseFloat(maxTotal) };
    }

    // Date range filter
    if (dateRange) {
      const now = new Date();
      let startDate, endDate;

      switch (dateRange) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        case "yesterday":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "last7days":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case "last30days":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case "last90days":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case "thisMonth":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case "lastMonth":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          break;
      }

      if (startDate && endDate) {
        query.createdAt = { $gte: startDate, $lt: endDate };
      }
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

router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === "") {
      return res.json({ orders: [] });
    }

    const searchRegex = { $regex: q.trim(), $options: "i" };
    let matchConditions = {
      isDeleted: false,
      $or: [
        { "customer.name": searchRegex },
        { "customer.email": searchRegex },
        { orderNotes: searchRegex },
      ],
    };

    const orders = await orderModel.aggregate([
      { $addFields: { orderNumber: { $concat: ["ORD-", { $toUpper: { $substr: [{ $toString: "$_id" }, 16, 8] } }] } } },
      { $match: matchConditions },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { "customer.name": searchRegex },
            { "customer.email": searchRegex },
            { orderNotes: searchRegex },
            { "productDetails.name": searchRegex },
            { orderNumber: searchRegex },
          ],
        },
      },
      {
        $group: {
          _id: "$_id",
          order: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$order" } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "items.product",
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "items.vendor",
          foreignField: "_id",
          as: "items.vendor",
        },
      },
    ]);

    const ordersWithDetails = orders.map((order) => ({
      ...order,
      paymentVerified: order.paymentStatus === "paid" && !!order.paymentIntentId,
      transactionId: order.paymentIntentId || null,
      orderNumber: `ORD-${order._id.toString().slice(-8).toUpperCase()}`,
    }));

    res.json({ orders: ordersWithDetails });
  } catch (error) {
    console.log("Error searching orders:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/single/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const order = await orderModel
      .findOne({ _id: id, isDeleted: false })
      .populate("items.product", "name price images")
      .populate("items.vendor", "name")
      .populate("statusHistory.changedBy", "name");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderWithDetails = {
      ...order.toObject(),
      paymentVerified: order.paymentStatus === "paid" && !!order.paymentIntentId,
      transactionId: order.paymentIntentId || null,
      orderNumber: order.orderNumber,
    };

    res.json({ order: orderWithDetails });
  } catch (error) {
    console.log("Error fetching single order:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;