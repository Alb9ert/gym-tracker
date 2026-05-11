import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface Props { children: ReactNode; }

export function AppShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <main className="flex-1 pb-24 overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
