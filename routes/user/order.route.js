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
    console.log("Received order placement request",  JSON.stringify(data, null, 2));

    if (!data.customer || !data.items) {
      console.error("Order placement failed: Missing required fields", { status: 400, body: data });
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
    let subTotal = 0;

    for (const item of data.items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) {
        console.error("Order placement failed: Product not found", { status: 400, productId: item.productId, body: data });
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} not found`,
        });
      }

      const variantType = product.productVariant.variantType;
      let unitPrice = 0;
      let imageUrl = product.displayImage || "";
      let totalStock = 0;
      let variantDetails = {};

      if (variantType === "none") {
        const nonVar = product.productVariant.nonVariant;
        unitPrice = nonVar.salePricePerUnit || nonVar.basePricePerUnit || 0;
        totalStock = nonVar.totalStock || 0;
        if (nonVar.images && nonVar.images.length > 0) {
          imageUrl = nonVar.images[0].url || imageUrl;
        }
      } else if (variantType === "color") {
        const colorVar = product.productVariant.colorVariants.find(c => c.colorName === item.selectedColor);
        if (!colorVar) {
          console.error("Order placement failed: Invalid color selected", { status: 400, productId: item.productId, selectedColor: item.selectedColor, body: data });
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Invalid color selected for product ${product.name}`,
          });
        }
        const sizeVar = colorVar.sizes.find(s => s.sizeName === item.selectedSize);
        if (!sizeVar) {
          console.error("Order placement failed: Invalid size selected", { status: 400, productId: item.productId, selectedSize: item.selectedSize, body: data });  
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Invalid size selected for product ${product.name}`,
          });
        }
        unitPrice = sizeVar.salePricePerUnit || sizeVar.basePricePerUnit || 0;
        totalStock = sizeVar.totalStock || 0;
        if (colorVar.images && colorVar.images.length > 0) {
          imageUrl = colorVar.images[0].url || imageUrl;
        }
        variantDetails = { color: colorVar.colorName, size: sizeVar.sizeName };
      } else if (variantType === "size") {
        const sizeVar = product.productVariant.sizeVariants.find(s => s.sizeName === item.selectedSize);
        if (!sizeVar) {
          console.error("Order placement failed: Invalid size selected", { status: 400, productId: item.productId, selectedSize: item.selectedSize, body: data });
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Invalid size selected for product ${product.name}`,
          });
        }
        const colorVar = sizeVar.colors.find(c => c.colorName === item.selectedColor);
        if (!colorVar) {
          console.error("Order placement failed: Invalid color selected", { status: 400, productId: item.productId, selectedColor: item.selectedColor, body: data });
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Invalid color selected for product ${product.name}`,
          });
        }
        unitPrice = colorVar.salePricePerUnit || colorVar.basePricePerUnit || 0;
        totalStock = colorVar.totalStock || 0;
        if (sizeVar.images && sizeVar.images.length > 0) {
          imageUrl = sizeVar.images[0].url || imageUrl;
        }
        variantDetails = { size: sizeVar.sizeName, color: colorVar.colorName };
      } else if (variantType === "color-size") {
        const colorVar = product.productVariant.colorVariants.find(c => c.colorName === item.selectedColor);
        if (!colorVar) {
          console.error("Order placement failed: Invalid color selected", { status: 400, productId: item.productId, selectedColor: item.selectedColor, body: data });
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Invalid color selected for product ${product.name}`,
          });
        }
        const sizeVar = colorVar.sizes.find(s => s.sizeName === item.selectedSize);
        if (!sizeVar) {
          console.error("Order placement failed: Invalid size selected", { status: 400, productId: item.productId, selectedSize: item.selectedSize, body: data });
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Invalid size selected for product ${product.name}`,
          });
        }
        unitPrice = sizeVar.salePricePerUnit || sizeVar.basePricePerUnit || 0;
        totalStock = sizeVar.totalStock || 0;
        if (colorVar.images && colorVar.images.length > 0) {
          imageUrl = colorVar.images[0].url || imageUrl;
        }
        variantDetails = { color: colorVar.colorName, size: sizeVar.sizeName };
      }

      if (unitPrice <= 0) {
        console.error("Order placement failed: Invalid unit price", { status: 400, productId: item.productId, unitPrice, body: data });
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Invalid price for product ${product.name}`,
        });
      }

      if (totalStock < item.quantity) {
        console.error("Order placement failed: Insufficient stock", { status: 400, productId: item.productId, requestedQuantity: item.quantity, availableStock: totalStock, body: data });
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${product.name}`,
        });
      }

      const totalPrice = unitPrice * item.quantity;
      subTotal += totalPrice;

      items.push({
        product: item.productId,
        selectedOptions: {
          color: item.selectedColor,
          size: item.selectedSize,
        },
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        image: {
          url: imageUrl,
        },
        variantDetails,
      });
    }

    const shippingFee = data.shippingFee || 0;
    const grandTotal = subTotal + shippingFee;

    const order = new Order({
      customer,
      items,
      subTotal,
      taxAmount: 0,
      shippingFee,
      grandTotal,
      paymentMethod: data.paymentMethod,
      statusHistory: [{ status: "pending" }],
    });

    await order.save({ session });

    let paymentStatus = "pending";
    if (data.paymentMethod === "card") {
      paymentStatus = "paid";
      order.paymentStatus = "paid";
      order.paidAt = new Date();
      order.status = "confirmed";
      order.statusHistory.push({ status: "confirmed" });
    }

    await order.save({ session });

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
    console.log("Order details", JSON.stringify({
      orderId: order._id,
      subTotal,
      shippingFee,
      grandTotal,
      paymentMethod: data.paymentMethod,
      paymentStatus: order.paymentStatus,
    }, null, 2));
    res.status(200).json({
      success: true,
      message: "Order placed successfully",
      orderNumber: order.orderNumber,
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      subTotal: order.subTotal,
      taxAmount: order.taxAmount,
      shippingFee: order.shippingFee,
      grandTotal: order.grandTotal,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Order placement failed with 500 error", { status: 500, error: err.message, stack: err.stack, body: req.body });
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  } finally {
    session.endSession();
  }
});

module.exports = router;
