# API Profile Documentation

## Endpoint: Get User Profile

**Method:** `GET`  
**URL:** `/user/profile`  
**Authentication:** Required (Bearer Token)

### Description

Trả về thông tin profile của người dùng hiện tại dựa trên JWT token trong header Authorization.

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Response

#### Success Response (200 OK)

```json
{
  "id": "60d5ec49f0d2c84d8c8e1a5b",
  "username": "username123",
  "email": "user@example.com",
  "firstname": "John",
  "lastname": "Doe",
  "phone": "1234567890",
  "isActive": true,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

#### Error Responses

**401 Unauthorized** - Khi không có token hoặc token không hợp lệ

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**404 Not Found** - Khi không tìm thấy user

```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

### Example Usage

#### cURL

```bash
curl -X GET \
  http://localhost:3000/user/profile \
  -H 'Authorization: Bearer <your_jwt_token>'
```

#### JavaScript/Fetch

```javascript
const response = await fetch('http://localhost:3000/user/profile', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

const userProfile = await response.json();
```

### Notes

- API này yêu cầu người dùng đã đăng nhập và có JWT token hợp lệ
- Response không bao gồm password và các thông tin nhạy cảm khác
- Token được lấy từ endpoint `/user/login` khi đăng nhập thành công
