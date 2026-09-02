import type { ReactNode } from 'react';

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return <div data-group="private">{children}</div>;
}
