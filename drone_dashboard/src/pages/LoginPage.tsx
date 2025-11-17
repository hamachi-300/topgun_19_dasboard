import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { getCameraInfo } from '../api/tesa';

interface SideState {
  id: string;
  token: string;
  loading: boolean;
  ok: boolean | null;
  message?: string;
}

export default function LoginPage() {
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [def, setDef] = useState<SideState>({ id: '', token: '', loading: false, ok: null });
  const [off, setOff] = useState<SideState>({ id: '', token: '', loading: false, ok: null });
  const [formError, setFormError] = useState<string | null>(null);
  const allLoading = def.loading || off.loading;

  // Redirect if already logged in
  useEffect(() => {
    const s = useAuthStore.getState();
    const defOk = !!(s.defence?.cameraId && s.defence?.token);
    const offOk = !!(s.offence?.cameraId && s.offence?.token);
    if (defOk && offOk) nav('/');
  }, [nav]);

  async function testSide(side: 'defence' | 'offence') {
    const s = side === 'defence' ? def : off;
    const set = side === 'defence' ? setDef : setOff;

    if (!s.id || !s.token) {
      set({ ...s, ok: false, message: 'Camera ID and token are required.' });
      return;
    }

    set({ ...s, loading: true, ok: null, message: undefined });
    try {
      const info = await getCameraInfo(s.id, s.token);
      set({ ...s, loading: false, ok: true, message: `OK: ${info.name || info.id}` });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to verify';
      set({ ...s, loading: false, ok: false, message: msg });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!def.id || !def.token || !off.id || !off.token) {
      setFormError('Please fill Defence and Offence camera ID and token.');
      return;
    }

    try {
      const [defInfo, offInfo] = await Promise.all([
        getCameraInfo(def.id, def.token),
        getCameraInfo(off.id, off.token),
      ]);
      setDef((s) => ({ ...s, ok: true, message: `OK: ${defInfo.name || defInfo.id}` }));
      setOff((s) => ({ ...s, ok: true, message: `OK: ${offInfo.name || offInfo.id}` }));

      // Save credentials
      setAuth('defence', { cameraId: def.id, token: def.token });
      setAuth('offence', { cameraId: off.id, token: off.token });
      nav('/');
    } catch {
      setFormError('Verification failed. Please check both IDs/tokens and try again.');
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-3xl border rounded-xl p-6 grid grid-cols-2 gap-6 bg-neutral-800"
      >
        <h1 className="col-span-2 text-2xl font-bold text-center">
          MAP MONITORING – Login
        </h1>

        {/* Defence */}
        <section>
          <h2 className="font-semibold mb-2">Defence</h2>
          <label className="block text-sm mb-1">Camera ID</label>
          <input
            className="w-full border p-2 rounded mb-2 bg-neutral-900"
            value={def.id}
            onChange={(e) => setDef({ ...def, id: e.target.value, ok: null, message: undefined })}
            placeholder="defence camera id"
          />
          <label className="block text-sm mb-1">Token</label>
          <input
            className="w-full border p-2 rounded bg-neutral-900"
            value={def.token}
            onChange={(e) => setDef({ ...def, token: e.target.value, ok: null, message: undefined })}
            placeholder="defence token"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => testSide('defence')}
              disabled={allLoading}
              className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
            >
              {def.loading ? 'Testing…' : 'Test Defence'}
            </button>
            {def.ok === true && <span className="text-green-500 text-sm">{def.message}</span>}
            {def.ok === false && <span className="text-red-500 text-sm">{def.message}</span>}
          </div>
        </section>

        {/* Offence */}
        <section>
          <h2 className="font-semibold mb-2">Offence</h2>
          <label className="block text-sm mb-1">Camera ID</label>
          <input
            className="w-full border p-2 rounded mb-2 bg-neutral-900"
            value={off.id}
            onChange={(e) => setOff({ ...off, id: e.target.value, ok: null, message: undefined })}
            placeholder="offence camera id"
          />
          <label className="block text-sm mb-1">Token</label>
          <input
            className="w-full border p-2 rounded bg-neutral-900"
            value={off.token}
            onChange={(e) => setOff({ ...off, token: e.target.value, ok: null, message: undefined })}
            placeholder="offence token"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => testSide('offence')}
              disabled={allLoading}
              className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
            >
              {off.loading ? 'Testing…' : 'Test Offence'}
            </button>
            {off.ok === true && <span className="text-green-500 text-sm">{off.message}</span>}
            {off.ok === false && <span className="text-red-500 text-sm">{off.message}</span>}
          </div>
        </section>

        {formError && (
          <div className="col-span-2 text-red-400 text-sm -mt-2">{formError}</div>
        )}

        <div className="col-span-2 grid place-items-center">
          <button
            type="submit"
            className="px-6 py-2 rounded bg-emerald-600 text-white font-semibold"
            disabled={allLoading}
          >
            {allLoading ? 'Verifying…' : 'Continue to Dashboard'}
          </button>
        </div>
      </form>
    </div>
  );
}
