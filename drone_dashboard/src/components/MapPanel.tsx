// src/components/MapPanel.tsx
/**
 * MapPanel
 * - แสดงแผนที่ Mapbox
 * - ใช้เฉพาะ "response ล่าสุด" ตัวหน้า array (events[0])
 * - ใน response ล่าสุดนั้น ถ้ามี objects หลายตัว → แสดง marker ครบทุกตัว
 * - ถ้า objects ลดลง หรือว่าง → marker บนแผนที่จะลดลง / หายตาม
 * - Defence = ส้ม, Offence = น้ำเงิน
 * - ถ้า drone ฝั่งเรา กับฝั่งตรงข้าม อยู่ใกล้กัน < 10 m → แสดงวงเตือนสีม่วง + กล่องแจ้งเตือน
 * - เพิ่มสวิตช์เปลี่ยนประเภทแผนที่: Terrain / Satellite / Custom Vector (custom = dark-v11 แบบเก่า)
 */

import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { TeamSide, DetectionEvent } from '../types';

(mapboxgl as any).accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

const LOCATIONS: Record<TeamSide, { lng: number; lat: number }> = {
  defence: { lng: 101.166279, lat: 14.297567 },
  offence: { lng: 101.171298, lat: 14.286451 },
};

type MapType = 'terrain' | 'satellite' | 'customVector';

const MAP_STYLES: Record<MapType, string> = {
  terrain: 'mapbox://styles/mapbox/outdoors-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  // ใช้ style เก่าแบบเดิมของ dashboard
  customVector: 'mapbox://styles/mapbox/dark-v11',
};

const TEAM_COLOR: Record<TeamSide, string> = {
  defence: '#FF5722', // orange
  offence: '#2196F3', // blue
};

interface MapPanelProps {
  side: TeamSide;
  // history events ของฝั่งนั้น (events[0] = ล่าสุด)
  events: DetectionEvent[];
  // history ของฝั่งตรงข้าม (ใช้ตรวจใกล้กัน < 10 m)
  otherEvents?: DetectionEvent[];
}

interface ProximityAlert {
  ownId: string;
  otherId: string;
  distanceMeters: number;
}

type Pos = { lat: number; lng: number };
type ObjWithPos = { id: string; lat: number; lng: number };

const MapPanel: FC<MapPanelProps> = ({ side, events, otherEvents }) => {
  const [mapType, setMapType] = useState<MapType>('terrain');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const mapLoadedRef = useRef(false);

  const [alerts, setAlerts] = useState<ProximityAlert[]>([]);

  const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const n = parseFloat(value);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const distanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000; // m
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // init map 1 ครั้ง
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center = LOCATIONS[side];

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[mapType],
      center: [center.lng, center.lat],
      zoom: 16,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      mapLoadedRef.current = true;
    });

    mapRef.current = map;

    return () => {
      mapLoadedRef.current = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // เปลี่ยน style ของแผนที่ตามประเภทที่เลือก
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(MAP_STYLES[mapType]);
  }, [mapType]);

  // เปลี่ยน center ถ้า side เปลี่ยน (แค่เลื่อนกล้อง)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    const center = LOCATIONS[side];
    map.flyTo({
      center: [center.lng, center.lat],
      zoom: 16,
      essential: true,
    });
  }, [side]);

  // อัปเดต markers + proximity alerts เมื่อ events / otherEvents เปลี่ยน
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    // ล้าง marker เก่า
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    setAlerts([]);

    const latestOwn = events[0];
    const latestOther = otherEvents?.[0];

    if (!latestOwn || !latestOwn.objects) {
      // ไม่มี objects → ไม่มี marker
      return;
    }

    const color = TEAM_COLOR[side];
    const positions: Pos[] = [];
    const ownObjs: ObjWithPos[] = [];
    const otherObjs: ObjWithPos[] = [];

    // own side markers
    latestOwn.objects.forEach((obj: any) => {
      const lat = toNumber(obj.lat);
      const lng = toNumber(obj.lng);
      if (lat == null || lng == null) return;

      const id = String(obj.obj_id ?? '');

      ownObjs.push({ id, lat, lng });
      positions.push({ lat, lng });

      const el = document.createElement('div');
      el.className = 'drone-marker';
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '999px';
      el.style.backgroundColor = color;
      el.style.border = '2px solid #ffffff';
      el.style.boxShadow = '0 0 6px rgba(0,0,0,0.6)';

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // other side objects สำหรับตรวจใกล้กัน
    if (latestOther && latestOther.objects) {
      latestOther.objects.forEach((obj: any) => {
        const lat = toNumber(obj.lat);
        const lng = toNumber(obj.lng);
        if (lat == null || lng == null) return;
        const id = String(obj.obj_id ?? '');
        otherObjs.push({ id, lat, lng });
      });
    }

    // proximity check < 10 m
    const proximityAlerts: ProximityAlert[] = [];

    ownObjs.forEach((own) => {
      otherObjs.forEach((other) => {
        const d = distanceMeters(own.lat, own.lng, other.lat, other.lng);
        if (d < 10) {
          proximityAlerts.push({
            ownId: own.id,
            otherId: other.id,
            distanceMeters: d,
          });

          // midpoint circle
          const midLat = (own.lat + other.lat) / 2;
          const midLng = (own.lng + other.lng) / 2;

          const el = document.createElement('div');
          el.className = 'proximity-circle';
          el.style.width = '40px';
          el.style.height = '40px';
          el.style.borderRadius = '999px';
          el.style.border = '3px solid rgba(168, 85, 247, 0.9)'; // purple
          el.style.backgroundColor = 'rgba(168, 85, 247, 0.25)';
          el.style.boxShadow = '0 0 10px rgba(168,85,247,0.9)';
          el.style.transform = 'translate(-50%, -50%)';
          el.style.animation = 'proximity-pulse 1.4s infinite';

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([midLng, midLat])
            .addTo(map);

          markersRef.current.push(marker);
        }
      });
    });

    setAlerts(proximityAlerts);

    // fit bounds ให้เห็น marker ทั้งหมด (ถ้ามีหลายตัว)
    if (positions.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      positions.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: 19,
        duration: 600,
      });
    }
  }, [events, otherEvents]);

  return (
    <>
      <style>
        {`
          @keyframes map-pulse {
            0% {
              transform: translate(-50%, -50%) scale(0.5);
              opacity: 0.8;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.2);
              opacity: 0.4;
            }
            100% {
              transform: translate(-50%, -50%) scale(1.8);
              opacity: 0;
            }
          }

          @keyframes proximity-pulse {
            0% {
              transform: translate(-50%, -50%) scale(0.6);
              opacity: 1;
            }
            70% {
              transform: translate(-50%, -50%) scale(1.3);
              opacity: 0.35;
            }
            100% {
              transform: translate(-50%, -50%) scale(1.7);
              opacity: 0;
            }
          }
        `}
      </style>

      <div
        className="relative h-full w-full rounded border border-neutral-600 overflow-hidden"
        aria-label={`${side} map`}
      >
        {/* Map style switcher */}
        <div className="absolute top-3 left-3 z-10 flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMapType('terrain')}
            className={`px-2 py-1 rounded border ${
              mapType === 'terrain'
                ? 'bg-neutral-900/80 text-white border-white/70'
                : 'bg-neutral-800/70 text-neutral-200 border-neutral-500/80'
            }`}
          >
            Terrain
          </button>
          <button
            type="button"
            onClick={() => setMapType('satellite')}
            className={`px-2 py-1 rounded border ${
              mapType === 'satellite'
                ? 'bg-neutral-900/80 text-white border-white/70'
                : 'bg-neutral-800/70 text-neutral-200 border-neutral-500/80'
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setMapType('customVector')}
            className={`px-2 py-1 rounded border ${
              mapType === 'customVector'
                ? 'bg-neutral-900/80 text-white border-white/70'
                : 'bg-neutral-800/70 text-neutral-200 border-neutral-500/80'
            }`}
          >
            Custom
          </button>
        </div>

        <div ref={mapContainerRef} className="h-full w-full" />

        {alerts.length > 0 && (
          <div className="absolute top-3 right-3 z-10 rounded-lg bg-red-600/90 text-white text-xs px-3 py-2 shadow-lg max-w-xs">
            <div className="font-semibold mb-1">
              Proximity (&lt; 10 m) – {side.toUpperCase()}
            </div>
            <ul className="space-y-0.5">
              {alerts.slice(0, 3).map((a, idx) => (
                <li key={idx}>
                  Own:{a.ownId || '-'} / Other:{a.otherId || '-'} –{' '}
                  {a.distanceMeters.toFixed(1)} m
                </li>
              ))}
              {alerts.length > 3 && <li>+{alerts.length - 3} more pair(s)...</li>}
            </ul>
          </div>
        )}
      </div>
    </>
  );
};

export default MapPanel;
