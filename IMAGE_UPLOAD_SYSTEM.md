# Image Upload & Temporary Storage System

## Overview
This system implements a robust temporary image upload mechanism with automatic cleanup and proper migration to permanent storage when products are saved.

## Architecture

### 1. Upload Flow
```
Client Upload → Compression → Temp Storage (temp/products/) → Product Save → Move to Permanent (products/) → Temp Cleanup (Cron)
```

### 2. Key Components

#### A. Upload Controller (`controllers/admin/upload.controllers.js`)
- **Purpose**: Handles image uploads to temporary storage
- **Location**: Images uploaded to `temp/products/` folder on Cloudinary
- **Features**:
  - Automatic image compression (max 200KB)
  - WebP format conversion
  - Quality and size optimization
  - 5MB upload limit

**API Endpoint:**
```
POST /admin/upload
Content-Type: multipart/form-data
Body: { image: <file> }

Response:
{
  "success": true,
  "data": {
    "url": "https://cloudinary.com/temp/products/abc123.webp",
    "publicId": "temp/products/abc123"
  }
}
```

#### B. Image Migration Utilities (`utils/cloudinary.js`)

**moveImageFromTemp(publicId, newFolder)**
- Moves image from `temp/` to permanent folder
- Uses Cloudinary rename API
- Returns new URL and publicId

```javascript
const result = await moveImageFromTemp('temp/products/abc123', 'products');
// Returns: { success: true, file: { url, publicId: 'products/abc123' } }
```

**getTempImages(hoursOld)**
- Fetches all temp images older than specified hours
- Default: 24 hours
- Returns array of image metadata

**deleteManyFromCloudinary(publicIds)**
- Batch deletes multiple images
- Handles up to 100 images per request
- Returns success/failure counts

#### C. Product Routes with Image Migration

**Add Product (`routes/admin/products/add.route.js`)**
1. Receives product data with temp image URLs
2. Validates product data
3. **Moves display image** from temp to permanent
4. **Processes variant images**:
   - None variant: moves images for nonVariant
   - Size variants: moves images for each size
   - Color variants: moves images for each color
5. Saves product with permanent image URLs
6. **Rollback**: On error, deletes all moved images

**Update Product (`routes/admin/products/update.route.js`)**
1. Fetches existing product
2. **Handles mixed images**:
   - Keeps existing permanent images
   - Moves new temp images to permanent
3. **Deletes removed images** from Cloudinary
4. Updates product with new image URLs
5. **Rollback**: On error, deletes newly moved images

#### D. Automatic Cleanup Cron Job (`utils/cron.js`)

**Schedule**: Daily at 2:00 AM
**Function**: `cleanupTempImages()`

**Process**:
1. Fetches all temp images older than 24 hours
2. Deletes in batches of 100 (Cloudinary limit)
3. Logs results (deleted count, failed count)

**Initialization**: Auto-started in `server.js`
```javascript
const { initializeCronJobs } = require("./utils/cron");
initializeCronJobs();
```

## Image Lifecycle

### Timeline
```
Upload (t=0) → Save Product (t=minutes) → Cleanup Check (t=24h) → Delete if Not Moved
```

### States
1. **Temporary** (`temp/products/abc123`)
   - Just uploaded
   - Waiting for product save
   - Will be deleted after 24 hours if not moved

2. **Permanent** (`products/abc123`)
   - Moved during product save
   - Associated with saved product
   - Won't be deleted by cron job

3. **Orphaned** (Temp image > 24 hours old)
   - User uploaded but never saved product
   - Automatically deleted by cron job

## Error Handling & Rollback

### Product Add Failure
```javascript
// If product save fails:
1. Delete all moved images from permanent folder
2. Return error to client
3. Temp images remain (will be cleaned by cron)
```

### Product Update Failure
```javascript
// If product update fails:
1. Delete newly moved images
2. Keep existing permanent images
3. Return error to client
```

## Usage Examples

### Example 1: Add Product with Images
```javascript
// Step 1: Upload images to temp
POST /admin/upload
→ Returns: { publicId: "temp/products/img1" }

// Step 2: Create product
POST /admin/products/add
Body: {
  basicInfo: {
    name: "T-Shirt",
    displayImage: { publicId: "temp/products/img1", url: "..." }
  },
  noneVariant: {
    images: [
      { publicId: "temp/products/img2", url: "..." },
      { publicId: "temp/products/img3", url: "..." }
    ]
  }
}

// Backend automatically:
// - Moves temp/products/img1 → products/img1
// - Moves temp/products/img2 → products/img2
// - Moves temp/products/img3 → products/img3
// - Saves product with permanent URLs
```

### Example 2: Update Product with New Images
```javascript
// Step 1: Upload new image
POST /admin/upload
→ Returns: { publicId: "temp/products/new1" }

// Step 2: Update product
PATCH /admin/products/:id
Body: {
  noneVariant: {
    images: [
      { publicId: "products/old1", url: "..." },  // Keep existing
      { publicId: "temp/products/new1", url: "..." }  // Move new
    ]
  }
}

// Backend automatically:
// - Keeps products/old1 (already permanent)
// - Moves temp/products/new1 → products/new1
// - Updates product
```

## Configuration

### Cron Schedule (in `utils/cron.js`)
```javascript
// Current: Daily at 2:00 AM
cron.schedule("0 2 * * *", ...)

// To change frequency:
// Every 6 hours: "0 */6 * * *"
// Every hour: "0 * * * *"
// Twice daily: "0 2,14 * * *"
```

### Temp Image Retention Period
```javascript
// Current: 24 hours
const result = await getTempImages(24);

// To change: modify parameter
const result = await getTempImages(48); // 48 hours
```

## Monitoring & Logs

### Cron Job Logs
```
⏰ [Cron] Temp image cleanup scheduled (daily at 2:00 AM)
🧹 [Cron] Starting temp image cleanup...
📋 [Cron] Found 15 temp images to delete
✅ [Cron] Cleanup complete: 15 deleted, 0 failed
```

### Error Logs
```
❌ [Cron] Failed to fetch temp images: <error>
❌ [Cron] Failed to delete batch: <error>
```

## Benefits

1. **Storage Optimization**: Only keeps images for saved products
2. **User Experience**: Instant upload, deferred processing
3. **Automatic Cleanup**: No manual intervention needed
4. **Rollback Safety**: Failed saves don't leave orphaned images
5. **Reusable Functions**: All utilities can be used across the application

## Security Considerations

1. **Upload Limits**: 5MB per image
2. **File Type**: Automatically converted to WebP
3. **Compression**: Max 200KB after processing
4. **Validation**: Image verification before upload
5. **Cleanup**: Automatic deletion of unused images

## Troubleshooting

### Images Not Moving
- Check `moveImageFromTemp` return value
- Verify publicId format: must start with `temp/`
- Check Cloudinary credentials

### Cron Not Running
- Verify `initializeCronJobs()` is called in `server.js`
- Check server logs for cron initialization message
- Ensure server stays running (not just API requests)

### Images Deleted Too Soon
- Increase retention period in `getTempImages(hours)`
- Check system timezone for cron schedule
- Verify product save happens within 24 hours

## API Reference

### Upload Image
```
POST /admin/upload
Authorization: Required
Content-Type: multipart/form-data
Body: { image: File }

Success Response:
{
  "success": true,
  "data": {
    "url": "string",
    "publicId": "string"
  }
}

Error Response:
{
  "success": false,
  "message": "string"
}
```

### Delete Image
```
DELETE /admin/upload
Authorization: Required
Content-Type: application/json
Body: { publicId: "string" }

Success Response:
{
  "success": true,
  "message": "Image deleted successfully"
}
```

## Future Enhancements

1. **Image Optimization**
   - Multiple sizes (thumbnail, medium, large)
   - Lazy loading URLs
   - CDN integration

2. **Advanced Cleanup**
   - Configurable retention by image type
   - Soft delete before permanent removal
   - Cleanup notifications/reports

3. **Monitoring**
   - Dashboard for temp storage usage
   - Alerts for cleanup failures
   - Image upload analytics

4. **Performance**
   - Batch image moves
   - Parallel processing
   - Cache frequently accessed images
