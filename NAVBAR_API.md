# Navbar API Documentation

## Base URL
```
/admin/home-layout/navbar
```

## Authentication
All routes require authentication via `authMiddleware`.

---

## Endpoints

### 1. Get Navbar Configuration

**GET** `/admin/home-layout/navbar`

Retrieves the current navbar configuration. If no navbar exists, creates and returns a default one.

#### Request
```http
GET /admin/home-layout/navbar
Authorization: Bearer <token>
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "_id": "674f1234567890abcdef1234",
    "brand": {
      "name": "Store Name",
      "isNameShown": true,
      "logo": {
        "url": "https://cloudinary.com/navbar/logo123.webp",
        "publicId": "navbar/logo123"
      },
      "isLogoShown": true,
      "brandLinkActive": false
    },
    "createdAt": "2025-11-21T10:00:00.000Z",
    "updatedAt": "2025-11-21T10:00:00.000Z"
  }
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "success": false,
  "message": "Failed to fetch navbar",
  "error": "Error details (dev mode only)"
}
```

---

### 2. Update Brand Settings

**POST** `/admin/home-layout/navbar/brand`

Updates the brand configuration for the navbar. Handles temporary logo images by moving them to permanent storage.

#### Request
```http
POST /admin/home-layout/navbar/brand
Authorization: Bearer <token>
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "My Store",
  "isNameShown": true,
  "logo": {
    "url": "https://cloudinary.com/temp/navbar/abc123.webp",
    "publicId": "temp/navbar/abc123"
  },
  "isLogoShown": true,
  "brandLinkActive": true
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | Yes | Brand name (will be trimmed) |
| `isNameShown` | Boolean | No | Show/hide brand name (default: true) |
| `logo` | Object | No | Logo image data |
| `logo.url` | String | If logo | Image URL |
| `logo.publicId` | String | If logo | Cloudinary public ID |
| `isLogoShown` | Boolean | No | Show/hide logo (default: true) |
| `brandLinkActive` | Boolean | No | Enable brand as clickable link (default: false) |

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Brand settings updated successfully",
  "data": {
    "_id": "674f1234567890abcdef1234",
    "brand": {
      "name": "My Store",
      "isNameShown": true,
      "logo": {
        "url": "https://cloudinary.com/navbar/abc123.webp",
        "publicId": "navbar/abc123"
      },
      "isLogoShown": true,
      "brandLinkActive": true
    },
    "createdAt": "2025-11-21T10:00:00.000Z",
    "updatedAt": "2025-11-21T10:30:00.000Z"
  }
}
```

#### Error Responses

**400 Bad Request** - Invalid data
```json
{
  "success": false,
  "message": "Brand name is required"
}
```

**500 Internal Server Error** - Logo move failed
```json
{
  "success": false,
  "message": "Failed to move logo image"
}
```

**500 Internal Server Error** - Update failed
```json
{
  "success": false,
  "message": "Failed to update brand settings",
  "error": "Error details (dev mode only)"
}
```

---

## Image Handling

### Upload Logo Flow

1. **Upload Image to Temp**
   ```http
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

2. **Update Brand with Temp Image**
   ```http
   POST /admin/home-layout/navbar/brand
   Body: {
     "name": "Store",
     "logo": {
       "url": "https://cloudinary.com/temp/products/abc123.webp",
       "publicId": "temp/products/abc123"
     }
   }
   
   Backend automatically:
   - Moves image from temp/products/ to navbar/
   - Deletes old logo if exists
   - Returns permanent URL
   ```

3. **Result**
   ```json
   {
     "logo": {
       "url": "https://cloudinary.com/navbar/abc123.webp",
       "publicId": "navbar/abc123"
     }
   }
   ```

---

## Routing Structure

```
/admin/home-layout/navbar
├── GET  /                    → getNavbar()
└── /brand
    └── POST /                → updateBrand()

Future Extensions:
├── /links
│   ├── GET  /                → getLinks()
│   └── POST /                → updateLinks()
├── /icons
│   ├── GET  /                → getIcons()
│   └── POST /                → updateIcons()
└── /settings
    ├── GET  /                → getSettings()
    └── POST /                → updateSettings()
```

---

## Examples

### Example 1: Fetch Current Navbar
```bash
curl -X GET "http://localhost:3000/admin/home-layout/navbar" \
  -H "Authorization: Bearer eyJhbGc..."
```

### Example 2: Update Brand with Logo
```bash
# Step 1: Upload logo
curl -X POST "http://localhost:3000/admin/upload" \
  -H "Authorization: Bearer eyJhbGc..." \
  -F "image=@logo.png"

# Response: { "data": { "publicId": "temp/products/abc123" } }

# Step 2: Update brand
curl -X POST "http://localhost:3000/admin/home-layout/navbar/brand" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Awesome Store",
    "isNameShown": true,
    "logo": {
      "url": "https://cloudinary.com/temp/products/abc123.webp",
      "publicId": "temp/products/abc123"
    },
    "isLogoShown": true,
    "brandLinkActive": true
  }'
```

### Example 3: Hide Brand Name, Show Only Logo
```bash
curl -X POST "http://localhost:3000/admin/home-layout/navbar/brand" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Store Name",
    "isNameShown": false,
    "isLogoShown": true,
    "brandLinkActive": false
  }'
```

### Example 4: Show Brand Name Only (No Logo)
```bash
curl -X POST "http://localhost:3000/admin/home-layout/navbar/brand" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Store",
    "isNameShown": true,
    "logo": {
      "url": "",
      "publicId": ""
    },
    "isLogoShown": false,
    "brandLinkActive": true
  }'
```

---

## Frontend Integration

### React/Next.js Example

```javascript
// Fetch navbar configuration
const fetchNavbar = async () => {
  const response = await fetch('/admin/home-layout/navbar', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data.data;
};

// Update brand settings
const updateBrand = async (brandData) => {
  const response = await fetch('/admin/home-layout/navbar/brand', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(brandData)
  });
  const data = await response.json();
  return data;
};

// Complete flow with logo upload
const updateBrandWithLogo = async (logoFile, brandName) => {
  // 1. Upload logo
  const formData = new FormData();
  formData.append('image', logoFile);
  
  const uploadRes = await fetch('/admin/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  const { data: logoData } = await uploadRes.json();
  
  // 2. Update brand
  const brandData = {
    name: brandName,
    isNameShown: true,
    logo: {
      url: logoData.url,
      publicId: logoData.publicId
    },
    isLogoShown: true,
    brandLinkActive: true
  };
  
  const result = await updateBrand(brandData);
  return result;
};
```

---

## Best Practices

1. **Always Validate on Frontend**
   - Check required fields before sending
   - Validate image size and format
   - Show user-friendly error messages

2. **Handle Temp Images Properly**
   - Upload images first, get temp publicId
   - Send temp publicId to update endpoint
   - Backend moves to permanent automatically

3. **Error Handling**
   - Check `success` field in response
   - Display appropriate error messages
   - Retry on network failures

4. **Image Optimization**
   - Compress images before upload
   - Use recommended sizes (logo: 200x80px)
   - Prefer PNG/WebP formats

5. **State Management**
   - Cache navbar configuration
   - Invalidate cache after updates
   - Show loading states

---

## Future Endpoints (Extensible Structure)

### Links Management
```
POST /admin/home-layout/navbar/links
GET  /admin/home-layout/navbar/links
```

### Icons Management
```
POST /admin/home-layout/navbar/icons
GET  /admin/home-layout/navbar/icons
```

### Settings Management
```
POST /admin/home-layout/navbar/settings
GET  /admin/home-layout/navbar/settings
```

Each section can be managed independently, following the same pattern as brand settings.

---

## Testing

### Manual Testing Checklist
- [ ] GET navbar returns default on first call
- [ ] POST brand updates name successfully
- [ ] POST brand with temp logo moves to permanent
- [ ] Old logo deleted when new logo uploaded
- [ ] isNameShown toggles visibility
- [ ] isLogoShown toggles visibility
- [ ] brandLinkActive toggles link behavior
- [ ] Validation fails for empty name
- [ ] Error handling works for invalid data

### Automated Testing Example
```javascript
describe('Navbar API', () => {
  it('should fetch navbar configuration', async () => {
    const res = await request(app)
      .get('/admin/home-layout/navbar')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.brand).toBeDefined();
  });
  
  it('should update brand settings', async () => {
    const res = await request(app)
      .post('/admin/home-layout/navbar/brand')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Store',
        isNameShown: true,
        isLogoShown: false,
        brandLinkActive: true
      })
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.brand.name).toBe('Test Store');
  });
});
```

---

## Troubleshooting

### Issue: Navbar not found
**Solution**: First GET request creates default navbar automatically

### Issue: Logo not moving from temp
**Solution**: Ensure publicId starts with "temp/" and exists in Cloudinary

### Issue: Old logo not deleted
**Solution**: Check deleteFromCloudinary function and Cloudinary credentials

### Issue: Validation errors
**Solution**: Ensure brand name is provided and not empty

---

## Security Notes

1. **Authentication Required**: All routes protected by authMiddleware
2. **Input Sanitization**: Brand name is trimmed
3. **Image Validation**: Only valid images accepted
4. **Rate Limiting**: Consider adding rate limits for update endpoints
5. **Cloudinary Security**: Use signed uploads in production
