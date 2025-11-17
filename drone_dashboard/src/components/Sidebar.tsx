// src/components/Sidebar.tsx
import type { FC } from 'react';
import { useState } from 'react';
import type { TeamSide, DetectionEvent, DetectionObject } from '../types';
import { API_BASE } from '../api/client';

interface SidebarProps {
  side: TeamSide;
  isConnected: boolean;
  events: DetectionEvent[];
  onClear?: () => void;
  clearing?: boolean;
}

// Remove trailing /api from API_BASE → host root
const HOST_BASE = API_BASE.replace(/\/api\/?$/, '');

// helper: build image url from event (supports image_url or image_path)
const buildImageUrl = (ev: DetectionEvent | null): string | undefined => {
  if (!ev) return undefined;

  const anyEv = ev as any;
  const rawUrl: string | undefined =
    anyEv.image_url ??
    anyEv.image ??
    anyEv.imagePath ??
    anyEv.image_path ??
    anyEv.thumbnail;

  if (!rawUrl) return undefined;

  // absolute URL
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  // relative path from backend (ex: /api/files/...)
  return `${HOST_BASE}${rawUrl}`;
};

// helper: flatten object details from DetectionObject (objective, size, and nested details)
const extractObjectDetailEntries = (obj: DetectionObject): [string, string][] => {
  const entries: [string, string][] = [];

  if (obj.objective) {
    entries.push(['objective', String(obj.objective)]);
  }
  if (obj.size) {
    entries.push(['size', String(obj.size)]);
  }

  const raw = obj.details as any;
  if (raw && typeof raw === 'object') {
    // support nested { details: { color, speed, ... } }
    const inner =
      raw.details && typeof raw.details === 'object' ? raw.details : raw;
    for (const [key, value] of Object.entries(inner)) {
      if (value !== undefined && value !== null) {
        entries.push([key, String(value)]);
      }
    }
  }

  return entries;
};

const Sidebar: FC<SidebarProps> = ({
  side,
  isConnected,
  events,
  onClear,
  clearing,
}) => {
  const [selected, setSelected] = useState<DetectionEvent | null>(null);

  const sideLabel = side === 'defence' ? 'DEFENCE' : 'OFFENCE';
  const sideColor = side === 'defence' ? 'text-red-400' : 'text-blue-400';

  const selectedImageUrl = selected ? buildImageUrl(selected) : undefined;

  return (
    <>
      {/* MAIN SIDEBAR PANEL */}
      <div className="flex flex-col gap-2 h-full">
        {/* header */}
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-xs font-semibold ${sideColor}`}>
              {sideLabel}
            </div>
            <div className="text-xs text-neutral-400">
              Socket:{' '}
              {isConnected ? (
                <span className="text-green-500">connected</span>
              ) : (
                'disconnected'
              )}{' '}
              · Events: {events.length}
            </div>
          </div>

          {onClear && (
            <button
              type="button"
              onClick={onClear}
              disabled={!!clearing}
              className="px-2 py-1 text-xs rounded bg-red-500 hover:bg-red-600 disabled:bg-red-900 disabled:opacity-50"
            >
              {clearing ? 'Clearing…' : 'Clear'}
            </button>
          )}
        </div>

        {/* LIST OF EVENTS (HISTORY) – limited height + scroll */}
        <div
          className="
            bg-neutral-900 border border-neutral-700 rounded p-2 space-y-2
            max-h-[calc(100vh-180px)]
            overflow-y-auto
          "
        >
          {events.map((ev) => {
            const ts = ev.timestamp
              ? new Date(ev.timestamp).toLocaleString()
              : '';
            const imageUrl = buildImageUrl(ev);

            return (
              <button
                key={ev.event_id}
                type="button"
                onClick={() => setSelected(ev)}
                className="w-full text-left bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded flex gap-2 p-2 cursor-pointer"
              >
                {/* text info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-neutral-400 truncate">
                    {ts}
                  </div>
                  <div className="text-xs font-semibold break-all">
                    {ev.event_id}
                  </div>
                  <div className="mt-1 text-[11px] text-neutral-300">
                    Objects: {ev.objects?.length ?? 0}
                  </div>
                </div>

                {/* thumbnail image (if have) */}
                {imageUrl && (
                  <div className="w-20 h-16 rounded overflow-hidden border border-neutral-700 bg-black flex items-center justify-center">
                    <img
                      src={imageUrl}
                      alt={`Detection ${ev.event_id}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </button>
            );
          })}

          {events.length === 0 && (
            <div className="text-xs text-neutral-500 text-center py-4">
              No events yet.
            </div>
          )}
        </div>
      </div>

      {/* MODAL DETAIL + FULL IMAGE + ALL OBJECT FIELDS */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-700 p-4 rounded max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg mb-2">Event details</h3>
            <div className="text-sm mb-1 break-all">
              ID: {selected.event_id}
            </div>
            <div className="text-sm mb-3">
              Time:{' '}
              {selected.timestamp
                ? new Date(selected.timestamp).toLocaleString()
                : 'N/A'}
            </div>

            {/* full image */}
            {selectedImageUrl && (
              <div className="mb-4">
                <div className="text-sm font-semibold mb-1">Image</div>
                <div className="border border-neutral-700 rounded overflow-hidden bg-black max-h-[400px]">
                  <img
                    src={selectedImageUrl}
                    alt={`Detection ${selected.event_id}`}
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>
            )}

            {/* all objects detail */}
            <div className="text-sm font-semibold mt-1 mb-1">Objects</div>
            <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
              {(selected.objects ?? []).map((obj, index) => {
                const entries = extractObjectDetailEntries(
                  obj as DetectionObject
                );

                return (
                  <div
                    key={obj.obj_id ?? index}
                    className="p-2 bg-neutral-800 rounded border border-neutral-700"
                  >
                    <div className="font-semibold mb-1">
                      #{index + 1} {obj.obj_id || '(no id)'}
                      {obj.type ? ` · ${obj.type}` : ''}
                    </div>
                    <div>lat: {String(obj.lat)}</div>
                    <div>lng: {String(obj.lng)}</div>

                    {entries.length > 0 && (
                      <div className="mt-1">
                        <div className="font-semibold">details:</div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {entries.map(([key, value]) => (
                            <li key={key}>
                              {key}: {value}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}

              {(!selected.objects || selected.objects.length === 0) && (
                <div className="text-neutral-400">
                  No objects in this event.
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-sm"
              >
              Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
