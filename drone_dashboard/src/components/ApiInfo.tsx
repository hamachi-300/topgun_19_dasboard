import type { CameraInfo, DetectionEvent } from '../types';

export default function ApiInfo({
  side,
  camera,
  latest,
}: {
  side: 'defence' | 'offence';
  camera?: CameraInfo | null;
  latest?: DetectionEvent | null;
}) {
  return (
    <div className="p-3 border rounded-lg text-sm max-h-[220px] overflow-auto">
      <div className="font-semibold uppercase mb-2">API INFORMATION – {side}</div>
      {camera ? (
        <div className="grid grid-cols-2 gap-2">
          <div>ID</div><div className="font-mono break-all">{camera.id}</div>
          <div>Team</div><div>{camera.name}</div>
        </div>
      ) : (
        <div>No camera info loaded.</div>
      )}

      {latest && (
        <div className="mt-3">
          <div className="font-medium">Latest Event</div>
          <div className="font-mono text-xs">{new Date(latest.timestamp).toLocaleString()}</div>
          <div>Objects: {latest.objects.length}</div>
        </div>
      )}
    </div>
  );
}
