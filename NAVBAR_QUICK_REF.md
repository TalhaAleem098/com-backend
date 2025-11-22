# Navbar API Quick Reference

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/home-layout/navbar` | Get navbar configuration |
| POST | `/admin/home-layout/navbar/brand` | Update brand settings |

---

## Quick Examples

### Get Navbar
```bash
GET /admin/home-layout/navbar
Authorization: Bearer <token>
```

### Update Brand
```bash
POST /admin/home-layout/navbar/brand
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "My Store",
  "isNameShown": true,
  "logo": {
    "url": "https://...",
    "publicId": "temp/products/abc123"
  },
  "isLogoShown": true,
  "brandLinkActive": true
}
```

---

## File Structure

```
backend/
├── controllers/
│   └── admin/
│       └── homeLayout/
│           └── navbar.controllers.js    ← Business logic
├── routes/
│   └── admin/
│       └── homeLayout/
│           ├── navbar.route.js          ← Main navbar routes
│           └── navbar/
│               └── brand.route.js       ← Brand-specific routes
└── models/
    └── homeLayout/
        └── navbar.js                     ← Mongoose schema
```

---

## Controller Functions

### `getNavbar(req, res)`
- Fetches current navbar
- Creates default if doesn't exist
- Returns navbar data

### `updateBrand(req, res)`
- Validates brand name
- Moves temp logo to permanent
- Deletes old logo
- Updates navbar
- Returns updated data

---

## Schema

```javascript
{
  brand: {
    name: String,              // Required
    isNameShown: Boolean,      // Default: true
    logo: {
      url: String,             // Required
      publicId: String         // Required
    },
    isLogoShown: Boolean,      // Default: true
    brandLinkActive: Boolean   // Default: false
  }
}
```

---

## Image Flow

```
1. Upload Image
   POST /admin/upload
   ↓
   temp/products/abc123

2. Update Brand
   POST /admin/home-layout/navbar/brand
   ↓
   Backend moves: temp/products/abc123 → navbar/abc123
   Backend deletes: old logo (if exists)
   ↓
   navbar/abc123 (permanent)
```

---

## Response Format

### Success
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "message": "...",
  "error": "..." // dev mode only
}
```

---

## Common Use Cases

### 1. Show Logo Only
```json
{
  "name": "Store",
  "isNameShown": false,
  "isLogoShown": true
}
```

### 2. Show Name Only
```json
{
  "name": "Store",
  "isNameShown": true,
  "isLogoShown": false
}
```

### 3. Show Both
```json
{
  "name": "Store",
  "isNameShown": true,
  "isLogoShown": true
}
```

### 4. Brand as Link
```json
{
  "name": "Store",
  "brandLinkActive": true
}
```

---

## Frontend Integration

```javascript
// Fetch navbar
const navbar = await fetch('/admin/home-layout/navbar', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// Update brand with logo
const formData = new FormData();
formData.append('image', logoFile);

// 1. Upload
const upload = await fetch('/admin/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
}).then(r => r.json());

// 2. Update
const result = await fetch('/admin/home-layout/navbar/brand', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'My Store',
    isNameShown: true,
    logo: {
      url: upload.data.url,
      publicId: upload.data.publicId
    },
    isLogoShown: true,
    brandLinkActive: true
  })
}).then(r => r.json());
```

---

## Extensible Structure

The routing structure is designed for easy extension:

```javascript
// Current
/admin/home-layout/navbar
├── GET  /              (getNavbar)
└── /brand
    └── POST /          (updateBrand)

// Future additions (follow same pattern)
├── /links
│   └── POST /          (updateLinks)
├── /icons
│   └── POST /          (updateIcons)
└── /settings
    └── POST /          (updateSettings)
```

### Adding New Sections

1. **Create Controller**
   ```javascript
   // controllers/admin/homeLayout/navbar.controllers.js
   const updateLinks = async (req, res) => { ... };
   module.exports = { ..., updateLinks };
   ```

2. **Create Route**
   ```javascript
   // routes/admin/homeLayout/navbar/links.route.js
   const router = require("express").Router();
   const { updateLinks } = require("@/controllers/...");
   router.post("/", updateLinks);
   module.exports = router;
   ```

3. **Register Route**
   ```javascript
   // routes/admin/homeLayout/navbar.route.js
   router.use("/links", require("./links.route"));
   ```

---

## Testing

```bash
# Get navbar
curl -X GET "http://localhost:3000/admin/home-layout/navbar" \
  -H "Authorization: Bearer <token>"

# Update brand
curl -X POST "http://localhost:3000/admin/home-layout/navbar/brand" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Store","isNameShown":true,"isLogoShown":true}'
```

---

## Validation Rules

- ✅ Brand name: Required, non-empty
- ✅ Logo: Optional, but both url and publicId required if provided
- ✅ Booleans: Default values provided
- ✅ Temp images: Automatically moved to permanent
- ✅ Old logos: Automatically deleted on update

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 500 | Server Error (move/delete/update failed) |
