import React from 'react';
import LogoutButton from './LogoutButton';

export default function AppHeader() {
  return (
    <header className="w-full border-b border-neutral-800 bg-neutral-900/60 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded bg-white/10" />
          <h1 className="text-sm font-medium text-neutral-100">
            TESA Monitor
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
