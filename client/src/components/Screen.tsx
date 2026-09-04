import type { ReactNode } from 'react';

export default function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 pb-28">
      {children}
    </div>
  );
}
