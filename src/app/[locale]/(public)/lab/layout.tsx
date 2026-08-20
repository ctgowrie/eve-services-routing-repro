import type { ReactNode } from 'react';

// Parallel @modal slot + interception, mirroring the Lab catalog in the app
// this was found in: clicking a card soft-navigates to /[locale]/lab/[slug]
// and the (.)[slug] interception renders it as a modal over the catalog.
export default function LabLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
