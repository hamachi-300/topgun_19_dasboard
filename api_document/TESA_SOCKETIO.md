# TESA Socket.IO Documentation

## Socket.IO Server URL
```
https://tesa-api.crma.dev
```

---

## หลักการทำงาน

TESA ใช้ Socket.IO สำหรับการส่งข้อมูลแบบ real-time จากเซิร์ฟเวอร์ไปยัง client โดยมีระบบ **subscribe/unsubscribe** สำหรับการติดตามข้อมูลจากกล้องแต่ละตัว

### ขั้นตอนการทำงาน:

1. **Client เชื่อมต่อ** กับ Socket.IO server
2. **Subscribe camera** - Client ส่ง `subscribe_camera` event พร้อม `cam_id` เพื่อบอกว่าต้องการรับข้อมูลจากกล้องไหน
3. **รับข้อมูล real-time** - เมื่อมีการตรวจจับวัตถุใหม่ เซิร์ฟเวอร์จะส่ง `object_detection` event มาให้ client
4. **Unsubscribe** - เมื่อไม่ต้องการรับข้อมูลแล้ว client ส่ง `unsubscribe_camera` event
5. **ตัดการเชื่อมต่อ** - Client ตัดการเชื่อมต่อกับ Socket.IO server

---

## วิธีการเชื่อมต่อ

### 1. ติดตั้ง Socket.IO Client
```bash
npm install socket.io-client
```

### 2. เชื่อมต่อกับ Server
```typescript
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://tesa-api.crma.dev';

const socket: Socket = io(SOCKET_URL);
```

### 3. รับสัญญาณการเชื่อมต่อ
```typescript
socket.on('connect', () => {
  console.log('Connected to socket server');
  console.log('Socket ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected from socket server');
});
```

---

## Subscribe Camera

เมื่อเชื่อมต่อสำเร็จ ต้อง subscribe camera เพื่อรับข้อมูลการตรวจจับ

### Event: `subscribe_camera`

```typescript
socket.emit('subscribe_camera', {
  cam_id: 'your-camera-id'
});
```

### Parameters
```typescript
{
  cam_id: string  // UUID ของกล้องที่ต้องการติดตาม
}
```

### ตัวอย่างการใช้งาน
```typescript
const cameraId = '550e8400-e29b-41d4-a716-446655440000';

socket.on('connect', () => {
  console.log('Connected to socket server');

  // Subscribe to camera
  socket.emit('subscribe_camera', { cam_id: cameraId });
  console.log(`Subscribed to camera: ${cameraId}`);
});
```

---

## รับข้อมูล Detection Real-time

เมื่อ subscribe camera แล้ว จะได้รับข้อมูลการตรวจจับผ่าน event `object_detection`

### Event: `object_detection`

```typescript
socket.on('object_detection', (data) => {
  console.log('Received object detection:', data);
  // Process detection data here
});
```

### Data Structure
```typescript
{
  cam_id: string;           // UUID ของกล้อง
  timestamp: string;        // ISO 8601 timestamp
  camera: {
    id: string;
    name: string;
    location: string;       // 'defence' | 'offence'
  };
  image: {
    path: string;           // Path ของรูปภาพ เช่น '/uploads/images/2025/01/11/image.jpg'
  };
  objects: Array<{
    obj_id: string;         // ID ของวัตถุ เช่น 'obj_001'
    type: string;           // ประเภทของวัตถุ เช่น 'drone'
    lat: number;            // Latitude
    lng: number;            // Longitude
    objective: string;      // 'unknown' | 'our' | 'enemy'
    size: string;           // 'small' | 'medium' | 'large'
  }>;
}
```

### ตัวอย่างข้อมูลที่รับ
```json
{
  "cam_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-11T10:30:00.000Z",
  "camera": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Team Alpha",
    "location": "defence"
  },
  "image": {
    "path": "/uploads/images/2025/01/11/image.jpg"
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
```

---

## Unsubscribe Camera

เมื่อไม่ต้องการรับข้อมูลจากกล้องแล้ว ควร unsubscribe

### Event: `unsubscribe_camera`

```typescript
socket.emit('unsubscribe_camera', {
  cam_id: 'your-camera-id'
});
```

### Parameters
```typescript
{
  cam_id: string  // UUID ของกล้องที่ต้องการหยุดติดตาม
}
```

---

## ตัดการเชื่อมต่อ

```typescript
socket.disconnect();
```

---

## Complete React Hook Example

ตัวอย่างการสร้าง custom hook สำหรับใช้งาน Socket.IO ใน React

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface DetectionEvent {
  id: number;
  cam_id: string;
  camera: {
    id: string;
    name: string;
    location: string;
  };
  timestamp: string;
  image_path: string;
  objects: Array<{
    obj_id: string;
    type: string;
    lat: number;
    lng: number;
    objective: string;
    size: string;
  }>;
}

export const useSocket = (camId: string, enabled: boolean) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [realtimeData, setRealtimeData] = useState<DetectionEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // ถ้าไม่ enable หรือไม่มี camId ให้ตัดการเชื่อมต่อ
    if (!enabled || !camId) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // สร้าง socket instance
    const socketInstance = io('https://tesa-api.crma.dev');

    // Event: เชื่อมต่อสำเร็จ
    socketInstance.on('connect', () => {
      console.log('Connected to socket server');
      setIsConnected(true);

      // Subscribe to camera
      socketInstance.emit('subscribe_camera', { cam_id: camId });
    });

    // Event: ตัดการเชื่อมต่อ
    socketInstance.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setIsConnected(false);
    });

    // Event: รับข้อมูล object detection
    socketInstance.on('object_detection', (data: any) => {
      console.log('Received object detection:', data);

      // แปลง data structure ให้ตรงกับ interface
      setRealtimeData({
        id: Date.now(), // Generate temporary ID
        cam_id: data.cam_id,
        camera: data.camera,
        timestamp: data.timestamp,
        image_path: data.image.path,
        objects: data.objects,
      });
    });

    setSocket(socketInstance);

    // Cleanup function
    return () => {
      if (socketInstance) {
        // Unsubscribe camera
        socketInstance.emit('unsubscribe_camera', { cam_id: camId });
        // Disconnect socket
        socketInstance.disconnect();
      }
    };
  }, [camId, enabled]);

  return { socket, realtimeData, isConnected };
};
```

### การใช้งาน Hook

```typescript
import { useSocket } from './hooks/useSocket';

function MyComponent() {
  const cameraId = '550e8400-e29b-41d4-a716-446655440000';
  const [isEnabled, setIsEnabled] = useState(true);

  const { socket, realtimeData, isConnected } = useSocket(cameraId, isEnabled);

  useEffect(() => {
    if (realtimeData) {
      console.log('New detection received:', realtimeData);
      // Process the new detection data
      // เช่น เพิ่มเข้า state array, แสดงบนแผนที่, etc.
    }
  }, [realtimeData]);

  return (
    <div>
      <p>Socket Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {realtimeData && (
        <div>
          <h3>Latest Detection:</h3>
          <p>Timestamp: {realtimeData.timestamp}</p>
          <p>Objects: {realtimeData.objects.length}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Data Trigger Flow

```
1. กล้อง/Simulator ส่งข้อมูลการตรวจจับไปที่ API
   ↓
2. API Server รับข้อมูล, บันทึกลงฐานข้อมูล
   ↓
3. API Server ส่งข้อมูลผ่าน Socket.IO ไปยัง clients ที่ subscribe กล้องนั้น
   ↓
4. Client ที่ subscribe camera จะได้รับ event 'object_detection'
   ↓
5. Client ประมวลผลและแสดงผลข้อมูลแบบ real-time
```

---

## Tips & Best Practices

1. **ควร unsubscribe** เมื่อไม่ใช้งาน component แล้ว เพื่อลดการใช้ทรัพยากร
2. **ตรวจสอบ connection status** ก่อนส่ง event
3. **จัดการ error และ reconnection** ให้เหมาะสม
4. **ใช้ useEffect cleanup function** สำหรับ disconnect socket ใน React
5. **เก็บ socket instance ใน state/ref** เพื่อควบคุมการเชื่อมต่อ
