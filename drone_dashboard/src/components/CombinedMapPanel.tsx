// src/components/CombinedMapPanel.tsx
/**
 * CombinedMapPanel
 * - Single Mapbox map that shows BOTH defence and offence drones together.
 * - Uses latest event (events[0]) from each side as current state.
 * - If a defence drone and an offence drone are closer than 10 m:
 *   - Shows a special circular marker at the midpoint on the map.
 *   - Shows a red alert box overlay with details.
 * - Defence markers = orange, Offence markers = blue.
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

interface CombinedMapPanelProps {
  defenceEvents: DetectionEvent[];
  offenceEvents: DetectionEvent[];
}

interface ProximityAlert {
  defenceId: string;
  offenceId: string;
  distanceMeters: number;
}

type Pos = { lat: number; lng: number };
type ObjWithPos = { id: string; lat: number; lng: number };

const CombinedMapPanel: FC<CombinedMapPanelProps> = ({
  defenceEvents,
  offenceEvents,
}) => {
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

  // init map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaultCenter = {
      lng: (LOCATIONS.defence.lng + LOCATIONS.offence.lng) / 2,
      lat: (LOCATIONS.defence.lat + LOCATIONS.offence.lat) / 2,
    };

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[mapType],
      center: [defaultCenter.lng, defaultCenter.lat],
      zoom: 15.5,
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

  // update map style when mapType changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(MAP_STYLES[mapType]);
  }, [mapType]);

  // อัปเดต markers + proximity alerts เมื่อ events เปลี่ยน
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    setAlerts([]);

    const latestDefence = defenceEvents[0];
    const latestOffence = offenceEvents[0];

    const positions: Pos[] = [];
    const defenceObjs: ObjWithPos[] = [];
    const offenceObjs: ObjWithPos[] = [];

    // Draw defence markers
    if (latestDefence && latestDefence.objects) {
      latestDefence.objects.forEach((obj: any) => {
        const lat = toNumber(obj.lat);
        const lng = toNumber(obj.lng);
        if (lat == null || lng == null) return;

        const id = String(obj.obj_id ?? '');

        defenceObjs.push({ id, lat, lng });
        positions.push({ lat, lng });

        const el = document.createElement('div');
        el.className = 'drone-marker defence-marker';
        el.style.width = '14px';
        el.style.height = '14px';
        el.style.borderRadius = '999px';
        el.style.backgroundColor = TEAM_COLOR.defence;
        el.style.border = '2px solid #ffffff';
        el.style.boxShadow = '0 0 6px rgba(0,0,0,0.6)';

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // Draw offence markers
    if (latestOffence && latestOffence.objects) {
      latestOffence.objects.forEach((obj: any) => {
        const lat = toNumber(obj.lat);
        const lng = toNumber(obj.lng);
        if (lat == null || lng == null) return;

        const id = String(obj.obj_id ?? '');

        offenceObjs.push({ id, lat, lng });
        positions.push({ lat, lng });

        const el = document.createElement('div');
        el.className = 'drone-marker offence-marker';
        el.style.width = '14px';
        el.style.height = '14px';
        el.style.borderRadius = '999px';
        el.style.backgroundColor = TEAM_COLOR.offence;
        el.style.border = '2px solid #ffffff';
        el.style.boxShadow = '0 0 6px rgba(0,0,0,0.6)';

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // Proximity detection between defence and offence < 10 m
    const proximityAlerts: ProximityAlert[] = [];

    defenceObjs.forEach((d) => {
      offenceObjs.forEach((o) => {
        const dist = distanceMeters(d.lat, d.lng, o.lat, o.lng);
        if (dist < 10) {
          proximityAlerts.push({
            defenceId: d.id,
            offenceId: o.id,
            distanceMeters: dist,
          });

          const midLat = (d.lat + o.lat) / 2;
          const midLng = (d.lng + o.lng) / 2;

          const el = document.createElement('div');
          el.className = 'proximity-circle';
          el.style.width = '40px';
          el.style.height = '40px';
          el.style.borderRadius = '999px';
          el.style.border = '3px solid rgba(168, 85, 247, 0.9)';
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

    // Fit bounds if we have positions
    if (positions.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      positions.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: 18,
        duration: 600,
      });
    }
  }, [defenceEvents, offenceEvents]);

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
        aria-label="combined map"
      >
        {/* Map style switcher – top right */}
        <div className="absolute top-3 right-3 z-10 flex gap-2 text-xs">
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
          <div className="absolute top-3 left-3 z-10 rounded-lg bg-red-600/90 text-white text-xs px-3 py-2 shadow-lg max-w-xs">
            <div className="font-semibold mb-1">Proximity alert (&lt; 10 m)</div>
            <ul className="space-y-0.5">
              {alerts.slice(0, 3).map((a, idx) => (
                <li key={idx}>
                  D:{a.defenceId || '-'} / O:{a.offenceId || '-'} –{' '}
                  {a.distanceMeters.toFixed(1)} m
                </li>
              ))}
              {alerts.length > 3 && (
                <li>+{alerts.length - 3} more pair(s)...</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </>
  );
};

export default CombinedMapPanel;
