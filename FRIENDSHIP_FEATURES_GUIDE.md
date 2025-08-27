# Hướng dẫn sử dụng tính năng bạn bè

## 🎯 Tổng quan

Hệ thống ZaloUTE_be đã được cập nhật với các tính năng quản lý bạn bè:

✅ **Đã hoàn thành:**

- Tìm kiếm người dùng bằng email
- Gửi lời mời kết bạn
- Chấp nhận/Từ chối lời mời kết bạn
- Huỷ kết bạn
- Hiển thị danh sách bạn bè
- Xem hồ sơ bạn bè với trạng thái kết bạn

## 🏗️ Kiến trúc được thêm

### Domain Layer

- `FriendshipEntity` - Entity cho mối quan hệ bạn bè
- `FriendshipRepository` - Interface repository
- `FriendshipStatus` - Enum trạng thái kết bạn

### Infrastructure Layer

- `Friendship Schema` - MongoDB schema với indexes tối ưu
- `FriendshipRepositoryImpl` - Implementation repository với aggregation

### Application Layer

- **Use Cases:**
  - `SearchUserByEmailUseCase` - Tìm kiếm người dùng
  - `SendFriendRequestUseCase` - Gửi lời mời kết bạn
  - `RespondFriendRequestUseCase` - Phản hồi lời mời
  - `UnfriendUseCase` - Huỷ kết bạn
  - `GetFriendsListUseCase` - Lấy danh sách bạn bè
  - `ViewFriendProfileUseCase` - Xem hồ sơ với trạng thái

### Presentation Layer

- 6 endpoints mới trong `UserController`
- DTO validation với class-validator
- Swagger documentation

## 🚀 Cách sử dụng

### 1. Khởi động server

```bash
npm run start:dev
```

### 2. Truy cập API Documentation

- Swagger UI: `http://localhost:3000/api`
- API Tests: Sử dụng file `FRIENDSHIP_API_TESTS.http`

### 3. Flow cơ bản

#### Bước 1: Đăng ký và kích hoạt tài khoản

```javascript
// Đăng ký 2 user để test
POST / user / register;
POST / user / activate - account;
POST / user / login; // Lấy JWT token
```

#### Bước 2: Tìm kiếm và kết bạn

```javascript
// Tìm kiếm người dùng
GET /user/search?email=john

// Gửi lời mời kết bạn
POST /user/friends/request
{ "receiverId": "user_id" }
```

#### Bước 3: Phản hồi lời mời (từ user khác)

```javascript
POST /user/friends/respond
{
  "friendshipId": "friendship_id",
  "action": "accept" // hoặc "reject"
}
```

#### Bước 4: Quản lý bạn bè

```javascript
// Xem danh sách bạn bè
GET / user / friends;

// Xem hồ sơ bạn bè
GET / user / profile / { userId };

// Huỷ kết bạn
DELETE / user / friends / { friendId };
```

## 📊 Database Changes

### Friendship Collection

```javascript
{
  requesterId: ObjectId,    // Người gửi lời mời
  receiverId: ObjectId,     // Người nhận lời mời
  status: "pending|accepted|rejected|blocked",
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes được tạo

- `{ requesterId: 1, receiverId: 1 }` unique
- `{ requesterId: 1 }`
- `{ receiverId: 1 }`

## 🔒 Bảo mật

- Tất cả endpoints yêu cầu JWT authentication
- Validation đầu vào với class-validator
- Kiểm tra quyền (chỉ có thể phản hồi lời mời gửi cho mình)
- Tránh duplicate friendship requests

## 📱 Frontend Integration

### State management

```javascript
// User search results
const [searchResults, setSearchResults] = useState([]);

// Friends list
const [friends, setFriends] = useState([]);

// Friend requests (pending)
const [friendRequests, setFriendRequests] = useState([]);
```

### API calls

```javascript
// Tìm kiếm
const searchUsers = async (email) => {
  const response = await fetch(`/user/search?email=${email}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

// Gửi lời mời
const sendFriendRequest = async (receiverId) => {
  await fetch('/user/friends/request', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ receiverId }),
  });
};
```

## 🔄 Possible Enhancements

1. **Real-time notifications** - Socket.io cho thông báo lời mời kết bạn
2. **Friend suggestions** - Gợi ý bạn bè dựa trên mutual friends
3. **Block users** - Chặn người dùng
4. **Friend groups** - Nhóm bạn bè
5. **Activity feed** - Hoạt động của bạn bè

## 🐛 Troubleshooting

### Common Issues:

1. **"Duplicate DTO detected"** - Warning không ảnh hưởng chức năng
2. **JWT Token expired** - Đăng nhập lại để lấy token mới
3. **User not found** - Kiểm tra user đã được activate
4. **Friend request already sent** - Kiểm tra trạng thái friendship

### Logs to check:

- Server console cho compilation errors
- Network tab trong browser để debug API calls
- MongoDB logs cho database issues

## 📞 Support

Nếu có vấn đề, kiểm tra:

1. Server console logs
2. API documentation tại `/api`
3. File test examples trong `FRIENDSHIP_API_TESTS.http`
