# TESA API Documentation

## Base URL
```
https://tesa-api.crma.dev/api
```

## Authentication
ใช้ Header `x-camera-token` ในการ authenticate ทุก request

```
x-camera-token: your-camera-token-here
```

---

## 1. Get Camera Info

ดึงข้อมูลของกล้อง เช่น ชื่อ, ตำแหน่ง (defence/offence)

### Endpoint
```
GET /object-detection/info/{camera_id}
```

### Headers
```
x-camera-token: your-camera-token
```

### Parameters
- `camera_id` (path parameter) - UUID ของกล้อง

### Response Example
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Team Alpha",
    "location": "defence",
    "token": "hashed_token",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

### Implementation Example (TypeScript)
```typescript
import axios from 'axios';

const API_BASE_URL = 'https://tesa-api.crma.dev/api';

async function getCameraInfo(cameraId: string, token: string) {
  const response = await axios.get(
    `${API_BASE_URL}/object-detection/info/${cameraId}`,
    {
      headers: {
        'x-camera-token': token,
      },
    }
  );

  return response.data;
}
```

---

## 2. Get Recent Detection Events

ดึงประวัติการตรวจจับวัตถุล่าสุดของกล้อง

### Endpoint
```
GET /object-detection/{camera_id}
```

### Headers
```
x-camera-token: your-camera-token
```

### Parameters
- `camera_id` (path parameter) - UUID ของกล้อง

### Response Example
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "cam_id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2025-01-11T10:30:00.000Z",
      "image_path": "/uploads/images/2025/01/11/image.jpg",
      "camera": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Team Alpha",
        "location": "defence"
      },
      "objects": [
        {
          "obj_id": "obj_001",
          "type": "drone",
          "lat": 14.297567,
          "lng": 101.166279,
          "objective": "unknown",
          "size": "medium"
        }
      ]
    }
  ]
}
```

### Implementation Example (TypeScript)
```typescript
import axios from 'axios';

const API_BASE_URL = 'https://tesa-api.crma.dev/api';

interface DetectedObject {
  obj_id: string;
  type: string;
  lat: number;
  lng: number;
  objective: string;
  size: string;
}

interface DetectionEvent {
  id: number;
  cam_id: string;
  timestamp: string;
  image_path: string;
  camera: {
    id: string;
    name: string;
    location: string;
  };
  objects: DetectedObject[];
}

async function getRecentDetections(cameraId: string, token: string): Promise<DetectionEvent[]> {
  const response = await axios.get(
    `${API_BASE_URL}/object-detection/${cameraId}`,
    {
      headers: {
        'x-camera-token': token,
      },
    }
  );

  return response.data.data;
}
```

### Usage in React (with TanStack Query)
```typescript
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = 'https://tesa-api.crma.dev/api';

export const useDetections = (cameraId: string, token: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['detections', cameraId],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/object-detection/${cameraId}`,
        {
          headers: {
            'x-camera-token': token,
          },
        }
      );
      return response.data;
    },
    enabled: enabled && !!cameraId && !!token,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};
```

---

## Error Responses

### 401 Unauthorized
Token ไม่ถูกต้องหรือหมดอายุ
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### 404 Not Found
ไม่พบกล้องที่ระบุ
```json
{
  "success": false,
  "message": "Camera not found"
}
```

### 500 Internal Server Error
เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
```json
{
  "success": false,
  "message": "Internal server error"
}
```
