import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthSide {
  cameraId: string;
  token: string;
}

interface AuthState {
  defence?: AuthSide | null;
  offence?: AuthSide | null;
  setAuth: (side: 'defence' | 'offence', data: AuthSide) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      defence: null,
      offence: null,
      setAuth: (side, data) => set({ [side]: data }),
      clear: () => set({ defence: null, offence: null }),
    }),
    { name: 'tesa-auth' }
  )
);
