// src/api/tesa.ts
import { api, authHeaders } from './client';
import type { CameraInfo, DetectionEvent } from '../types';

/**
 * Fetch basic information about a camera.
 */
export async function getCameraInfo(cameraId: string, token: string) {
  const { data } = await api.get<{ success: boolean; data: CameraInfo }>(
    `/object-detection/info/${cameraId}`,
    { headers: authHeaders(token) }
  );
  return data.data;
}

/**
 * Fetch recent detection events for a camera.
 */
export async function getRecentDetections(
  cameraId: string,
  token: string
): Promise<DetectionEvent[]> {
  const { data } = await api.get<{ success: boolean; data: DetectionEvent[] }>(
    `/object-detection/${cameraId}`,
    { headers: authHeaders(token) }
  );
  return data.data;
}

/**
 * Clear / delete all detection feed for a camera.
 *
 * This assumes your backend exposes:
 *   DELETE /object-detection/:camera_id
 * with header:
 *   x-camera-token: <token>
 *
 * Adjust the endpoint or HTTP method here if your API differs.
 */
export async function clearDetectionFeed(cameraId: string, token: string) {
  const { data } = await api.delete<{ success: boolean; message?: string }>(
    `/object-detection/clear/${cameraId}`,
    { headers: authHeaders(token) }
  );
  console.log(data);
  return data;
}
