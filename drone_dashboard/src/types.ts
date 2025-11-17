// src/types.ts

export type TeamSide = 'defence' | 'offence';

export interface DetectionObject {
  obj_id: string;
  type: string;
  lat: number;
  lng: number;
  objective?: string;
  size?: string;
  details?: any;
}

export interface DetectionEvent {
  // numeric id from API (97903, 97883, …)
  id: number;
  // string id for legacy usage (event_id was used earlier in UI)
  event_id: string;
  cam_id: string;

  timestamp: string;
  image_path?: string; // "/api/files/df68.../eb70b175.jpg"

  camera?: {
    id: string;
    name: string;
    location: string;
    token: string;
    sort: number;
    Institute?: string;
  };

  objects: DetectionObject[];
}

export interface CameraInfo {
  id: string;
  name: string;
  location: TeamSide;
  token?: string;
  sort?: number;
  Institute?: string;
}
