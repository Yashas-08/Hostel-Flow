import type { ReactNode } from 'react';

/**
 * Admin-only content wrapper. Mirrors Screen.tsx on mobile (max-w-md, centered)
 * so the mobile Admin experience is pixel-identical to before, but widens
 * progressively on tablet/desktop where a persistent sidebar replaces the
 * bottom nav, so extra bottom padding is no longer needed.
 */
export default function AdminScreen({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-28 md:max-w-2xl lg:max-w-6xl lg:px-8 lg:pb-10 lg:pt-6">
      {children}
    </div>
  );
}
