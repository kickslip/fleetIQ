import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FleetIQ — Fleet & Logistics Management',
  description: 'Live vehicle tracking, dispatch, POD, geofencing and fuel-fraud detection',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
