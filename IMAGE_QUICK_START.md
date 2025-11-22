# Quick Start: Image Upload System

## For Frontend Developers

### 1. Upload Image (Temporary)
```javascript
// Upload to temp folder
const formData = new FormData();
formData.append('image', file);

const response = await fetch('/admin/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});

const { data } = await response.json();
// data = { url: "...", publicId: "temp/products/abc123" }

// Store this for product creation
const imageData = {
  url: data.url,
  publicId: data.publicId
};
```

### 2. Create Product with Images
```javascript
// Include temp images in product data
const productData = {
  basicInfo: {
    name: "Product Name",
    displayImage: imageData, // temp image
    // ... other fields
  },
  noneVariant: {
    images: [imageData, imageData2], // temp images
    // ... other fields
  }
};

await fetch('/admin/products/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(productData)
});

// Backend automatically moves images from temp to permanent
```

### 3. Update Product with New Images
```javascript
// Mix of existing and new images
const updateData = {
  noneVariant: {
    images: [
      existingImage,  // { publicId: "products/old123", url: "..." }
      newTempImage    // { publicId: "temp/products/new456", url: "..." }
    ]
  }
};

// Backend keeps existing, moves new temp images
```

## For Backend Developers

### Image Upload Flow
```
1. POST /admin/upload → temp/products/
2. Frontend stores temp URL & publicId
3. POST /admin/products/add → moves to products/
4. Cron job (2 AM daily) → deletes old temp images
```

### Reusable Functions

#### Move Single Image
```javascript
const { moveImageFromTemp } = require('@/utils/cloudinary');

const result = await moveImageFromTemp('temp/products/abc', 'products');
if (result.success) {
  console.log(result.file.url);      // New URL
  console.log(result.file.publicId); // products/abc
}
```

#### Process Image Array
```javascript
// In add.route.js
const processImages = async (images) => {
  if (!Array.isArray(images) || images.length === 0) return [];
  
  const movedImages = await Promise.all(
    images.map(async (img) => {
      try {
        return await moveImageToPermanent(img);
      } catch (err) {
        console.error("Error moving image:", err);
        return null;
      }
    })
  );

  return movedImages.filter(Boolean);
};

// Usage
const permanentImages = await processImages(tempImages);
```

#### Batch Delete
```javascript
const { deleteManyFromCloudinary } = require('@/utils/cloudinary');

const publicIds = ['temp/products/img1', 'temp/products/img2'];
const result = await deleteManyFromCloudinary(publicIds);
console.log(`Deleted: ${result.deleted}, Failed: ${result.failed}`);
```

## Configuration

### Change Cleanup Schedule
Edit `utils/cron.js`:
```javascript
// Current: Daily at 2 AM
cron.schedule("0 2 * * *", async () => { ... });

// Options:
// Every 6 hours: "0 */6 * * *"
// Every hour: "0 * * * *"
// Twice daily (2 AM & 2 PM): "0 2,14 * * *"
```

### Change Retention Period
```javascript
// Current: 24 hours
const result = await getTempImages(24);

// Change to 48 hours
const result = await getTempImages(48);
```

## Testing Checklist

- [ ] Upload image → verify it goes to `temp/products/`
- [ ] Create product → verify images move to `products/`
- [ ] Update product → verify new images move, old kept
- [ ] Delete product → verify images stay in Cloudinary
- [ ] Wait 24+ hours → verify temp images deleted by cron
- [ ] Failed product save → verify rollback deletes moved images

## Common Issues

### Issue: Images not moving
**Solution**: Check publicId format - must start with `temp/`

### Issue: Cron not running
**Solution**: Verify `initializeCronJobs()` called in `server.js`

### Issue: Images deleted too soon
**Solution**: Increase retention in `getTempImages(hours)`

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/admin/upload` | Upload image to temp |
| DELETE | `/admin/upload` | Delete image by publicId |
| POST | `/admin/products/add` | Create product (auto-moves images) |
| PATCH | `/admin/products/:id` | Update product (auto-moves new images) |

## Environment Variables
```env
CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Monitoring

Check logs for:
```
✅ [Cron] All cron jobs initialized
⏰ [Cron] Temp image cleanup scheduled (daily at 2:00 AM)
🧹 [Cron] Starting temp image cleanup...
📋 [Cron] Found X temp images to delete
✅ [Cron] Cleanup complete: X deleted, Y failed
```
