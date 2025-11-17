import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface SocketDetectionObject {
  obj_id: string;
  type: string;
  lat: number;
  lng: number;
  objective: 'unknown' | 'our' | 'enemy';
  size?: 'small' | 'medium' | 'large';
}

export interface SocketDetectionPayload {
  cam_id: string;
  timestamp: string;
  camera: { id: string; name: string; location: 'defence' | 'offence' };
  image?: { path?: string };
  objects: SocketDetectionObject[];
}

export interface DetectionEvent {
  id: number | string;
  cam_id: string;
  timestamp: string;
  image_path: string;
  camera: { id: string; name: string; location: 'defence' | 'offence' };
  objects: SocketDetectionObject[];
}

const SOCKET_URL = import.meta.env.VITE_TESA_SOCKET_URL as string;

export function useSocket(camId?: string, enabled = false) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latest, setLatest] = useState<DetectionEvent | null>(null);

  const clearFeedViaSocket = (cameraId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('clear_detection_feed', { cam_id: cameraId });
    }
  };

  useEffect(() => {
    if (!enabled || !camId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const s = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = s;

    s.on('connect', () => {
      setIsConnected(true);
      s.emit('subscribe_camera', { cam_id: camId });
    });

    s.on('disconnect', () => setIsConnected(false));

    // Main realtime event
    s.on('object_detection', (data: SocketDetectionPayload) => {
      setLatest({
        id: Date.now(),
        cam_id: data.cam_id,
        timestamp: data.timestamp,
        image_path: data.image?.path ?? '',
        camera: data.camera,
        objects: data.objects || [],
      });
    });

    return () => {
      s.emit('unsubscribe_camera', { cam_id: camId });
      s.disconnect();
    };
  }, [camId, enabled]);

  return { latest, isConnected, socketRef, clearFeedViaSocket };
}
