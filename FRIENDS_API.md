# Tính năng bạn bè API Documentation

## Tổng quan

Hệ thống đã được cập nhật với các tính năng quản lý bạn bè bao gồm:

- Tìm kiếm người dùng bằng email
- Gửi lời mời kết bạn
- Chấp nhận/Từ chối lời mời kết bạn
- Huỷ kết bạn
- Hiển thị danh sách bạn bè
- Xem hồ sơ người dùng/bạn bè

## API Endpoints

### 1. Tìm kiếm người dùng bằng email

**GET** `/user/search?email={email}`

**Headers:**

```
Authorization: Bearer {token}
```

**Query Parameters:**

- `email`: Email cần tìm kiếm (có thể là một phần của email)

**Response:**

```json
[
  {
    "id": "user_id",
    "username": "username",
    "email": "user@example.com",
    "firstname": "First",
    "lastname": "Last",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "isFriend": false,
    "friendshipStatus": "none" // none, pending, accepted, rejected
  }
]
```

### 2. Gửi lời mời kết bạn

**POST** `/user/friends/request`

**Headers:**

```
Authorization: Bearer {token}
```

**Body:**

```json
{
  "receiverId": "user_id_of_receiver"
}
```

**Response:**

```json
{
  "message": "Friend request sent successfully"
}
```

### 3. Phản hồi lời mời kết bạn

**POST** `/user/friends/respond`

**Headers:**

```
Authorization: Bearer {token}
```

**Body:**

```json
{
  "friendshipId": "friendship_id",
  "action": "accept" // hoặc "reject"
}
```

**Response:**

```json
{
  "message": "Friend request accepted" // hoặc "Friend request rejected"
}
```

### 4. Huỷ kết bạn

**DELETE** `/user/friends/{friendId}`

**Headers:**

```
Authorization: Bearer {token}
```

**Path Parameters:**

- `friendId`: ID của người bạn muốn huỷ kết bạn

**Response:**

```json
{
  "message": "Friend removed successfully"
}
```

### 5. Danh sách bạn bè

**GET** `/user/friends`

**Headers:**

```
Authorization: Bearer {token}
```

**Response:**

```json
[
  {
    "id": "friend_id",
    "username": "friend_username",
    "email": "friend@example.com",
    "firstname": "Friend",
    "lastname": "Name",
    "friendsSince": "2023-01-01T00:00:00.000Z"
  }
]
```

### 6. Xem hồ sơ người dùng

**GET** `/user/profile/{userId}`

**Headers:**

```
Authorization: Bearer {token}
```

**Path Parameters:**

- `userId`: ID của người dùng cần xem hồ sơ

**Response:**

```json
{
  "id": "user_id",
  "username": "username",
  "email": "user@example.com",
  "firstname": "First",
  "lastname": "Last",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "isFriend": true,
  "friendshipStatus": "accepted"
}
```

## Trạng thái kết bạn (Friendship Status)

- **none**: Không có mối quan hệ nào
- **pending**: Lời mời kết bạn đang chờ phản hồi
- **accepted**: Đã kết bạn
- **rejected**: Lời mời kết bạn đã bị từ chối
- **blocked**: Đã chặn (tính năng có thể mở rộng sau)

## Database Schema

### Friendship Collection

```javascript
{
  _id: ObjectId,
  requesterId: ObjectId, // ID người gửi lời mời
  receiverId: ObjectId,  // ID người nhận lời mời
  status: String,        // pending, accepted, rejected, blocked
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

- `{ requesterId: 1, receiverId: 1 }` (unique)
- `{ requesterId: 1 }`
- `{ receiverId: 1 }`

## Error Codes

- **400 Bad Request**: Dữ liệu đầu vào không hợp lệ
- **401 Unauthorized**: Token không hợp lệ hoặc không có token
- **404 Not Found**: Không tìm thấy người dùng hoặc lời mời kết bạn
- **409 Conflict**: Xung đột (ví dụ: đã gửi lời mời kết bạn)

## Ví dụ sử dụng

### Tìm kiếm và kết bạn

1. Tìm kiếm người dùng: `GET /user/search?email=john`
2. Gửi lời mời kết bạn: `POST /user/friends/request` với `receiverId`
3. Người nhận phản hồi: `POST /user/friends/respond` với `friendshipId` và `action`

### Quản lý bạn bè

1. Xem danh sách bạn bè: `GET /user/friends`
2. Xem hồ sơ bạn bè: `GET /user/profile/{userId}`
3. Huỷ kết bạn: `DELETE /user/friends/{friendId}`
