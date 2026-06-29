// app/components/ImageZoom.tsx

'use client';

import { useState } from 'react';

export default function ImageZoom({ src, alt, bg }: { src?: string; alt: string; bg: string }) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <>
      <div
        onClick={() => src && setZoomed(true)}
        style={{
          background: bg, borderRadius: 16, aspectRatio: '3/4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', cursor: src ? 'zoom-in' : 'default',
          position: 'relative'
        }}
      >
        {src ? (
          <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.4 }}>{alt}</span>
        )}
        {src && (
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            background: 'rgba(255,255,255,0.9)', borderRadius: 6,
            padding: '4px 8px', fontSize: 11, color: 'var(--text-secondary)',
            backdropFilter: 'blur(4px)'
          }}>
            Click to zoom
          </div>
        )}
      </div>

      {/* Lightbox */}
      {zoomed && (
        <div
          onClick={() => setZoomed(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', padding: 32
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={src}
              alt={alt}
              style={{
                maxWidth: '100%', maxHeight: '90vh',
                objectFit: 'contain', borderRadius: 12,
                boxShadow: '0 24px 80px rgba(0,0,0,0.5)'
              }}
            />
            <button
              onClick={() => setZoomed(false)}
              style={{
                position: 'absolute', top: -16, right: -16,
                width: 32, height: 32, borderRadius: '50%',
                background: 'white', border: 'none', cursor: 'pointer',
                fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >×</button>
          </div>
        </div>
      )}
    </>
  );
}