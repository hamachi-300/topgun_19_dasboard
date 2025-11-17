// src/pages/DashboardPage.tsx
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { getCameraInfo, getRecentDetections, clearDetectionFeed } from '../api/tesa';
import MapPanel from '../components/MapPanel';
import CombinedMapPanel from '../components/CombinedMapPanel';
import Sidebar from '../components/Sidebar';
import ApiInfo from '../components/ApiInfo';
import { useSocket } from '../hooks/useSocket';
import LogoutButton from '../components/LogoutButton';
import type { CameraInfo, DetectionEvent, TeamSide } from '../types';

interface SideState {
  camera: CameraInfo | null;
  events: DetectionEvent[];
  latest: DetectionEvent | null;
  isConnected: boolean;
  clearing: boolean;
  clearFeed: () => Promise<void>;
}

function useSide(side: TeamSide): SideState {
  const creds = useAuthStore((s) => s[side]);
  const [camera, setCamera] = useState<CameraInfo | null>(null);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [latest, setLatest] = useState<DetectionEvent | null>(null);
  const [clearing, setClearing] = useState(false);
  const { latest: socketLatest, isConnected, clearFeedViaSocket } = useSocket(
    creds?.cameraId,
    Boolean(creds?.cameraId && creds?.token)
  );

  // initial boot: fetch camera info + recent detections
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!creds?.cameraId || !creds?.token) return;

      try {
        const info = await getCameraInfo(creds.cameraId, creds.token);
        const recents = await getRecentDetections(creds.cameraId, creds.token);

        if (!cancelled) {
          setCamera(info);
          setEvents(recents);
          setLatest(recents[0] ?? null);
        }
      } catch (err) {
        console.error('Failed to boot side', side, err);
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [creds?.cameraId, creds?.token, side]);

  // stream updates from socket: push to history + set latest
  useEffect(() => {
    if (!socketLatest) return;

    setEvents((prev) => [socketLatest as DetectionEvent, ...prev].slice(0, 200));
    setLatest(socketLatest as DetectionEvent);
  }, [socketLatest]);

  const clearFeed = async () => {
    if (!creds?.cameraId || !creds?.token) return;

    const ok = window.confirm(
      `Delete all feed events for ${side.toUpperCase()} camera? This cannot be undone.`
    );
    if (!ok) return;

    try {
      setClearing(true);
      await clearDetectionFeed(creds.cameraId, creds.token);
      clearFeedViaSocket(creds.cameraId);
      setEvents([]);
      setLatest(null);
    } catch (err) {
      console.error('Failed to clear feed for', side, err);
      window.alert('Failed to clear feed. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  return { camera, events, latest, isConnected, clearing, clearFeed };
}

type MapMode = 'split' | 'fuse';
const MAP_MODE_KEY = 'tesa-map-mode';

export default function DashboardPage() {
  const defence = useSide('defence');
  const offence = useSide('offence');
  const logout = useAuthStore((s) => s.logout);

  // load initial mode from localStorage
  const [mapMode, setMapMode] = useState<MapMode>(() => {
    if (typeof window === 'undefined') return 'split';
    const saved = window.localStorage.getItem(MAP_MODE_KEY);
    return saved === 'fuse' ? 'fuse' : 'split';
  });

  // persist mode when it changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(MAP_MODE_KEY, mapMode);
      }
    } catch (e) {
      console.warn('Unable to persist mapMode', e);
    }
  }, [mapMode]);

  const tabBaseClass =
    'px-3 py-1.5 text-sm rounded-lg border transition-colors duration-150';
  const activeTabClass =
    'bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.8)]';
  const inactiveTabClass =
    'bg-neutral-900 text-neutral-300 border-neutral-600 hover:bg-neutral-800';

  return (
    <div className="min-h-screen p-4">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">TESA Map Monitoring</h1>
          <div className="text-sm opacity-70">
            Socket:{' '}
            {defence.isConnected || offence.isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        <LogoutButton />
      </header>

      {/* Map mode toggle */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-neutral-700 bg-neutral-900/80 p-1">
          <button
            type="button"
            onClick={() => setMapMode('split')}
            className={`${tabBaseClass} ${
              mapMode === 'split' ? activeTabClass : inactiveTabClass
            }`}
          >
            Split view (Defence / Offence)
          </button>
          <button
            type="button"
            onClick={() => setMapMode('fuse')}
            className={`${tabBaseClass} ${
              mapMode === 'fuse' ? activeTabClass : inactiveTabClass
            }`}
          >
            Fused view (all drones)
          </button>
        </div>

        <div className="text-xs text-neutral-400">
          Mode: <span className="font-mono">{mapMode.toUpperCase()}</span>
        </div>
      </div>

      {mapMode === 'split' ? (
        // Split-map layout (each map knows about the other side for proximity)
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start min-h-[calc(100vh-9rem)]">
          {/* LEFT PANEL — DEFENCE */}
          <section className="grid grid-rows-[400px_auto_auto] gap-2 border border-red-500 rounded-xl p-2 shadow-[0_0_10px_rgba(255,0,0,0.5)]">
            <div className="border rounded-xl overflow-hidden h-[400px]">
              <MapPanel
                side="defence"
                events={defence.events}
                otherEvents={offence.events}
              />
            </div>

            <div className="min-h-0">
              <ApiInfo side="defence" camera={defence.camera} latest={defence.latest} />
            </div>

            <div className="min-h-0">
              <Sidebar
                side="defence"
                isConnected={defence.isConnected}
                events={defence.events}
                onClear={defence.clearFeed}
                clearing={defence.clearing}
              />
            </div>
          </section>

          {/* NEON WHITE DIVIDER */}
          <div className="w-[3px] bg-white h-full rounded-full shadow-[0_0_18px_rgba(255,255,255,0.9)]" />

          {/* RIGHT PANEL — OFFENCE */}
          <section className="grid grid-rows-[400px_auto_auto] gap-2 border border-blue-500 rounded-xl p-2 shadow-[0_0_10px_rgba(0,120,255,0.5)]">
            <div className="border rounded-xl overflow-hidden h-[400px]">
              <MapPanel
                side="offence"
                events={offence.events}
                otherEvents={defence.events}
              />
            </div>

            <div className="min-h-0">
              <ApiInfo side="offence" camera={offence.camera} latest={offence.latest} />
            </div>

            <div className="min-h-0">
              <Sidebar
                side="offence"
                isConnected={offence.isConnected}
                events={offence.events}
                onClear={offence.clearFeed}
                clearing={offence.clearing}
              />
            </div>
          </section>
        </div>
      ) : (
        // Fused single-map layout: map center, history at bottom
        <div className="flex flex-col gap-4 items-stretch min-h-[calc(100vh-9rem)]">
          {/* Center map */}
          <section className="border border-teal-400 rounded-xl p-2 shadow-[0_0_16px_rgba(0,255,200,0.5)]">
            <div className="border rounded-xl overflow-hidden h-[600px]">
              <CombinedMapPanel
                defenceEvents={defence.events}
                offenceEvents={offence.events}
              />
            </div>
          </section>

          {/* Histories at bottom */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-red-500 rounded-xl p-2 shadow-[0_0_10px_rgba(255,0,0,0.4)]">
              <ApiInfo side="defence" camera={defence.camera} latest={defence.latest} />
              <div className="mt-2">
                <Sidebar
                  side="defence"
                  isConnected={defence.isConnected}
                  events={defence.events}
                  onClear={defence.clearFeed}
                  clearing={defence.clearing}
                />
              </div>
            </div>

            <div className="border border-blue-500 rounded-xl p-2 shadow-[0_0_10px_rgba(0,120,255,0.4)]">
              <ApiInfo side="offence" camera={offence.camera} latest={offence.latest} />
              <div className="mt-2">
                <Sidebar
                  side="offence"
                  isConnected={offence.isConnected}
                  events={offence.events}
                  onClear={offence.clearFeed}
                  clearing={offence.clearing}
                />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
