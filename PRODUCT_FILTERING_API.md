# Product Filtering API Documentation

## Overview
This API provides comprehensive product filtering with support for status, stock levels, search, and data detail levels.

## Query Parameters

### Core Parameters
- `page` (number, default: 1) - Page number for pagination
- `limit` (number, default: 10) - Number of items per page
- `data` (string: "full" | "partial", default: "full") - Response detail level
- `status` (string: "active" | "archived" | "deleted", default: "active") - Product status
- `stockFilter` (string: "instock" | "lowstock" | "outofstock") - Stock level filter (only for active products)
- `q`, `search`, `query` (string) - Search term for products

### Additional Filters
- `isActive` (boolean) - Filter by active/inactive state
- `isPublic` (boolean) - Filter by public/private state
- `category` (ObjectId) - Filter by category ID
- `brand` (ObjectId) - Filter by brand ID

## API Endpoints Usage

### 1. All Products (Active Only)
```
GET /products
GET /products?status=active
```
Returns all active products, regardless of stock level.

### 2. In Stock Products
```
GET /products?status=active&stockFilter=instock
```
Returns only active products that have stock available (totalStock > minStockToMaintain).

### 3. Low Stock Products
```
GET /products?status=active&stockFilter=lowstock
```
Returns only active products where stock is low (0 < totalStock <= minStockToMaintain).

### 4. Out of Stock Products
```
GET /products?status=active&stockFilter=outofstock
```
Returns only active products that are completely out of stock (totalStock = 0).

### 5. Archived Products
```
GET /products?status=archived
```
Returns all archived products.

### 6. Trash (Deleted Products)
```
GET /products?status=deleted
```
Returns deleted products from the last 30 days only.
Each product includes `daysUntilDeletion` field showing days remaining before permanent removal.

## Response Structure

### Partial Data Response (`data=partial`)
```json
{
  "products": [
    {
      "_id": "...",
      "name": "Product Name",
      "sku": "SKU123",
      "displayImage": "url",
      "totalStock": 150,
      "stockStatus": "instock",
      "hasInStock": true,
      "hasOutOfStock": false,
      "variants": [...],
      "minStockToMaintain": 10,
      "status": "active",
      "daysUntilDeletion": null,
      ...
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Full Data Response (`data=full`)
```json
{
  "products": [
    {
      "_id": "...",
      "name": "Product Name",
      "productVariant": {
        "variantType": "size",
        "sizeVariants": [...],
        ...
      },
      "totalStock": 150,
      "stockStatus": "instock",
      "daysUntilDeletion": null,
      ...all other fields
    }
  ],
  "pagination": {...}
}
```

## Stock Status Values
- `instock` - Product has sufficient stock (totalStock > minStockToMaintain)
- `lowstock` - Product stock is low (0 < totalStock <= minStockToMaintain)
- `outofstock` - Product is completely out of stock (totalStock = 0)

## Important Notes

1. **Deleted Products**: Only products deleted within the last 30 days are returned. Products older than 30 days remain in the database but are not fetched.

2. **Days Until Deletion**: For deleted products, the `daysUntilDeletion` field indicates how many days remain before the product is no longer shown (30-day window).

3. **Stock Filtering**: Stock filters (`instock`, `lowstock`, `outofstock`) only work with `status=active`. Attempting to use them with other statuses returns a 400 error.

4. **Variant-Level Stock Checking**:
   - **Partial Data**: Checks each variant/sub-variant individually. Sets `hasInStock` and `hasOutOfStock` flags.
   - **Full Data**: Calculates total stock across all variants and determines overall stock status.

5. **Search**: Works across product name, SKU, tags, and description fields.

## Example API Calls

```
# Get all active products with partial data
GET /products?data=partial

# Get active products with full data and search
GET /products?data=full&q=shirt

# Get low stock products
GET /products?stockFilter=lowstock

# Get out of stock products by category
GET /products?stockFilter=outofstock&category=65f123...

# Get archived products
GET /products?status=archived

# Get deleted products (trash)
GET /products?status=deleted

# Get products by brand with pagination
GET /products?brand=65f456...&page=2&limit=20

# Search in active products
GET /products?search=blue&status=active
```
