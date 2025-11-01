# Image Upload System Documentation

## Overview

This system implements a two-phase image upload approach for product management:
1. **Temporary Upload**: Images are first uploaded to a temporary Cloudinary folder
2. **Permanent Migration**: When a product is saved, images are moved from temp to permanent folders
3. **Automatic Cleanup**: A cron job automatically deletes old temporary images

## Architecture

### Phase 1: Temporary Image Upload

**Endpoint**: `POST /api/admin/upload`

When users upload images through the UI:
1. Image is compressed and optimized using Sharp
2. Image is uploaded to `temp/products` folder in Cloudinary
3. Metadata is attached (upload timestamp, type tags)
4. Response contains: `{ url, publicId }`

**Frontend Flow**:
```javascript
// User uploads image
const result = await uploadImageToBackend(file);
// Store the result: { url, publicId }
setImage(result.data);
```

### Phase 2: Product Creation & Image Migration

**Endpoint**: `POST /api/admin/products/add`

When product is saved:
1. Receives JSON payload with image objects (not files)
2. Validates all product data
3. Moves all images from `temp/products` to `products` folder
4. Creates product with permanent image URLs
5. On error: Rolls back moved images (deletes them from permanent folder)

**Image Object Structure**:
```javascript
{
  url: "https://res.cloudinary.com/[cloud]/image/upload/temp/products/abc123.webp",
  publicId: "temp/products/abc123"
}
```

**After Migration**:
```javascript
{
  url: "https://res.cloudinary.com/[cloud]/image/upload/products/abc123.webp",
  publicId: "products/abc123"
}
```

### Phase 3: Automatic Cleanup

**Cron Job**: Runs daily at 2:00 AM

1. Queries Cloudinary for images in `temp/` folder
2. Filters images older than 24 hours
3. Deletes them in batches of 100
4. Logs results to console

## Key Features

### 1. Rollback on Failure
If product creation fails after moving images, all moved images are automatically deleted to prevent orphaned files.

### 2. Context Preservation
Temporary images include metadata:
- `uploaded_at`: ISO timestamp
- `type`: "temporary"
- `tags`: ["temp", "product-upload"]

### 3. Batch Operations
The system handles multiple images efficiently:
- Multiple variants (size/color) with images
- Display image
- Non-variant images

### 4. Error Handling
- Invalid image format detection
- Size limit enforcement (5MB)
- Graceful degradation on Cloudinary errors
- Detailed error messages

## API Reference

### Upload Image (Temporary)

```http
POST /api/admin/upload
Content-Type: multipart/form-data

Body:
  image: File
```

**Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "publicId": "temp/products/abc123"
  }
}
```

### Delete Image

```http
DELETE /api/admin/upload
Content-Type: application/json

Body:
{
  "publicId": "temp/products/abc123"
}
```

### Create Product

```http
POST /api/admin/products/add
Content-Type: application/json

Body:
{
  "basicInfo": {
    "name": "Product Name",
    "description": "Description",
    "category": ["cat1"],
    "brand": ["brand1"],
    "displayImage": {
      "url": "https://...",
      "publicId": "temp/products/display123"
    },
    ...
  },
  "variantType": "none" | "size" | "color",
  "noneVariant": {
    "images": [
      { "url": "...", "publicId": "temp/products/img1" },
      { "url": "...", "publicId": "temp/products/img2" }
    ],
    "basePricePerUnit": 100,
    "salePricePerUnit": 90,
    "locationDistribution": [...]
  }
  // Or sizeVariants/colorVariants for other types
}
```

## Database Schema

Product images are stored as objects with `url` and `publicId`:

```javascript
// Non-variant
nonVariant: {
  images: [
    { url: String, publicId: String }
  ]
}

// Size variant
sizeVariants: [{
  images: [
    { url: String, publicId: String }
  ]
}]

// Color variant
colorVariants: [{
  images: [
    { url: String, publicId: String }
  ]
}]
```

## Cloudinary Utilities

### `uploadBufferToCloudinary(buffer, folder, options)`
Uploads image buffer to specified folder with optional metadata.

### `moveImageFromTemp(publicId, newFolder)`
Moves image from temp folder to permanent folder using Cloudinary's rename API.

### `deleteFromCloudinary(publicId)`
Deletes a single image.

### `deleteManyFromCloudinary(publicIds[])`
Batch deletes multiple images (max 100 per call).

### `getTempImages(hoursOld)`
Retrieves all temp images older than specified hours.

## Cron Configuration

Located in: `backend/utils/cron.js`

**Schedule**: Daily at 2:00 AM
**Pattern**: `0 2 * * *`

To modify:
```javascript
// Format: second minute hour day month weekday
cron.schedule("0 2 * * *", async () => {
  // cleanup logic
});
```

Common patterns:
- Every hour: `0 * * * *`
- Every 6 hours: `0 */6 * * *`
- Every day at midnight: `0 0 * * *`

## Frontend Integration

### Upload Component Flow

```javascript
// 1. User selects image
const handleImageUpload = async (files) => {
  const result = await uploadImageToBackend(file);
  if (result.success) {
    setBasicInfo(prev => ({
      ...prev,
      displayImage: result.data // { url, publicId }
    }));
  }
};

// 2. Display image preview
<img src={basicInfo.displayImage?.url} />

// 3. Submit product (images already uploaded)
const productData = {
  basicInfo: {
    ...basicInfo,
    displayImage: basicInfo.displayImage // { url, publicId }
  }
};
await addProduct(productData);
```

## Monitoring & Logs

### Cron Logs
```
⏰ [Cron] Temp image cleanup scheduled (daily at 2:00 AM)
🧹 [Cron] Starting temp image cleanup...
📋 [Cron] Found 15 temp images to delete
✅ [Cron] Cleanup complete: 15 deleted, 0 failed
```

### Product Creation Logs
```
Rolling back moved images: ["products/abc123", "products/def456"]
```

## Troubleshooting

### Images Not Moving
- Check if publicId starts with "temp/"
- Verify Cloudinary credentials
- Check console for errors

### Cleanup Not Running
- Verify cron is initialized in server.js
- Check server timezone
- Look for cron logs at 2:00 AM

### Orphaned Images
Run manual cleanup:
```javascript
const { getTempImages, deleteManyFromCloudinary } = require('./utils/cloudinary');

const cleanup = async () => {
  const result = await getTempImages(0); // All temp images
  const publicIds = result.images.map(img => img.publicId);
  await deleteManyFromCloudinary(publicIds);
};
```

## Best Practices

1. **Always use image objects**: Never send raw files in product creation
2. **Handle errors gracefully**: Show user-friendly messages
3. **Monitor temp folder**: Check periodically for buildup
4. **Test rollback**: Verify images are deleted on errors
5. **Optimize images**: Compress before upload to reduce costs

## Security Considerations

1. **File type validation**: Only images accepted
2. **Size limits**: 5MB max per image
3. **Rate limiting**: Prevent abuse of upload endpoint
4. **Authentication**: All endpoints require admin auth
5. **Public ID validation**: Prevent path traversal attacks

## Performance

- **Compression**: Images compressed to ~1-1.4MB
- **WebP format**: Modern format for better compression
- **Batch operations**: Up to 100 images deleted at once
- **Async operations**: Non-blocking image moves
- **Cloudinary CDN**: Fast global delivery

## Future Enhancements

1. **Image optimization**: AI-powered cropping and enhancement
2. **Bulk operations**: Move multiple products' images
3. **Analytics**: Track temp folder usage and costs
4. **Notifications**: Alert on cleanup failures
5. **Manual cleanup UI**: Admin interface for temp folder management
