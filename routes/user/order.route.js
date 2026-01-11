const router = require("express").Router();
const mongoose = require("mongoose");
const Order = require("../../models/order.models");
const Transaction = require("../../models/transaction.models");
const Product = require("../../models/product.models");
const { sendMail } = require("../../services/mail");

router.post("/place", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const data = req.body;

    if (!data.customer || !data.items || !data.subTotal) {
      console.warn("Order placement failed: Missing required fields", { body: data });
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const customer = {
      name: data.customer.name,
      email: data.customer.email,
      phone: data.customer.phone,
      address: data.customer.address,
    };

    const items = [];
    for (const item of data.items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) {
        console.warn("Order placement failed: Product not found", { productId: item.productId });
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} not found`,
        });
      }

      items.push({
        product: item.productId,
        selectedOptions: {
          color: item.selectedColor,
          size: item.selectedSize,
        },
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        image: {
          url: item.image,
        },
      });
    }

    // Create order
    const order = new Order({
      customer,
      items,
      subTotal: data.subTotal,
      taxAmount: data.taxAmount,
      shippingFee: data.shippingFee,
      grandTotal: data.grandTotal,
      paymentMethod: data.paymentMethod,
      statusHistory: [{ status: "pending" }],
    });

    await order.save({ session });

    // Handle payment (fake for now)
    let paymentStatus = "pending";
    if (data.paymentMethod === "card") {
      // Simulate payment success
      paymentStatus = "paid";
      order.paymentStatus = "paid";
      order.paidAt = new Date();
      order.status = "confirmed";
      order.statusHistory.push({ status: "confirmed" });
    }

    await order.save({ session });

    // Create transaction
    const transaction = new Transaction({
      order: order._id,
      amount: order.grandTotal,
      status: paymentStatus === "paid" ? "completed" : "pending",
      paymentGateway: "Fake Gateway",
      description: `Payment for order ${order.orderNumber}`,
    });

    await transaction.save({ session });

    const emailHtml = `
      <h1>Order Confirmation</h1>
      <p>Dear ${customer.name},</p>
      <p>Your order has been placed successfully.</p>
      <p>Order Number: ${order.orderNumber}</p>
      <p>Total: Rs ${order.grandTotal}</p>
      <p>Thank you for shopping with us!</p>
    `;

    await sendMail(customer.email, "Order Confirmation", emailHtml);

    await session.commitTransaction();

    console.log("Order placed successfully", { orderNumber: order.orderNumber, orderId: order._id, customerEmail: customer.email });

    res.status(200).json({
      success: true,
      message: "Order placed successfully",
      orderNumber: order.orderNumber,
      orderId: order._id,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Order placement failed with 500 error", { error: err.message, stack: err.stack, body: req.body });
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  } finally {
    session.endSession();
  }
});

module.exports = router;
