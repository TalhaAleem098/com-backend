const express = require("express");
const router = express.Router();
const { upload } = require("@/utils/multer");
const { uploadToCloudinary, uploadBufferToCloudinary } = require("@/utils/cloudinary");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const Product = require("@/models/product.models");

const generateSKU = async () => {
  let sku, exists = true;
  while (exists) {
    const raw = uuidv4().replace(/-/g, ""); // UUID without hyphens
    sku = raw.substring(0, 6).toUpperCase();
    exists = await Product.findOne({ sku });
  }
  return sku;
};

router.post("/", upload.any(), async (req, res) => {
  try {
    const body = Object.fromEntries(
      Object.entries(req.body).map(([k, v]) => {
        try { return [k, JSON.parse(v)]; } catch { return [k, v]; }
      })
    );

    const basic = body.basicInfo || {};
    const none = body.noneVariant || {};

    const productData = {
      name: basic.name || null,
      sku: basic.sku || await generateSKU(),
      description: [].concat(basic.description || []).filter(Boolean),
      tags: [].concat(basic.tags || []).filter(Boolean),
      careInstructions: basic.careInstructions || null,
      disclaimer: basic.disclaimer || null,
      minStockToMaintain: Number(basic.minStock) || 0,
      defaultCurrency: basic.defaultCurrency || { symbol: "Rs" },
      category: [].concat(basic.category || []).filter(Boolean),
      brand: [].concat(basic.brand || []).filter(Boolean),
      isActive: basic.isActive ?? true,
      isPublic: basic.isPublic ?? true,
      displayImage: basic.displayImage || null,
      productVariant: {
        variantType: "none",
        nonVariant: {
          locationDistribution: (none.locationDistribution || [])
            .map(ld => ld.locationId ? { branch: ld.locationId, stock: Number(ld.stock) || 0 } : null)
            .filter(Boolean),
          totalStock: (none.locationDistribution || []).reduce((sum, ld) => sum + (Number(ld.stock) || 0), 0),
          sold: Number(none.sold) || 0,
          images: [],
          purchasePricePerUnit: Number(none.purchasePricePerUnit) || 0,
          basePricePerUnit: Number(none.basePricePerUnit) || 0,
          salePricePerUnit: Number(none.salePricePerUnit) || null,
        },
        defaultCurrency: basic.defaultCurrency || none.defaultCurrency || { symbol: "Rs" },
        Measures: Array.isArray(body.measurements) ? body.measurements : [],
        measureUnit: none.measureUnit || basic.measureUnit || null,
      },
    };

    if (!productData.name) return res.status(400).json({ success: false, message: "Product name is required" });

    if (req.files && req.files.length) {
      const HARD_LIMIT = 5 * 1024 * 1024;
      const TARGET_MAX = Math.floor(1.4 * 1024 * 1024);

      for (const f of req.files) {
        if (!f.mimetype.startsWith("image/")) return res.status(400).json({ success: false, message: `Only images allowed: ${f.originalname}` });
        if (f.size > HARD_LIMIT) return res.status(400).json({ success: false, message: `File too large: ${f.originalname}, max 5MB` });
      }

      const compressToWebP = async buffer => {
        let out = await sharp(buffer).webp({ quality: 80 }).toBuffer();
        let quality = 70;
        while (out.length > TARGET_MAX && quality >= 40) {
          out = await sharp(buffer).webp({ quality }).toBuffer().catch(() => out);
          quality -= 10;
        }
        if (out.length > TARGET_MAX) {
          let width = (await sharp(buffer).metadata().catch(() => ({}))).width || null;
          let factor = 0.9;
          while (out.length > TARGET_MAX && factor > 0.3 && width) {
            out = await sharp(buffer).resize(Math.round(width * factor)).webp({ quality: 60 }).toBuffer().catch(() => out);
            factor -= 0.1;
          }
        }
        if (out.length > TARGET_MAX) throw new Error("Cannot compress image under 1.4MB");
        return out;
      };

      const uploaded = await Promise.all(req.files.map(async file => {
        const buf = file.buffer ? await compressToWebP(file.buffer) : await compressToWebP(await fs.promises.readFile(file.path));
        return { fieldname: file.fieldname, ...(await uploadBufferToCloudinary(buf, "products")) };
      }));

      for (const u of uploaded) {
        if (!u?.success || !u.file) continue;
        const fileObj = { url: u.file.url || u.file.secure_url || null, publicId: u.file.publicId || u.file.public_id || null };
        if (u.fieldname.toLowerCase().includes("displayimage")) productData.displayImage = fileObj.url;
        else productData.productVariant.nonVariant.images.push(fileObj);
      }
    }

    const product = new Product(productData);
    if (product.productVariant?.recalculateTotals) {
      try { product.productVariant.recalculateTotals(); } catch {}
    }
    await product.save();

    res.status(201).json({ success: true, message: "Product created successfully" });

  } catch (err) {
    console.error("Error creating product:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;