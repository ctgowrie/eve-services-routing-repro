'use client';

import { createPortal } from 'react-dom';
import { type ReactNode, useEffect, useState } from 'react';

// Drawer-like client layout, as the original app has around its create route:
// stateful, portals its children into document.body.
export default function CreateLayout({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div data-drawer="ssr">{children}</div>;
  return createPortal(
    <div data-drawer={open ? 'open' : 'closed'} style={{ position: 'fixed', inset: 0, background: '#111', color: '#eee' }}>
      <button type="button" onClick={() => setOpen(false)}>close</button>
      {children}
    </div>,
    document.body,
  );
}
