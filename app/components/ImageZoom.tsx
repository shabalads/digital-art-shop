// app/components/ImageZoom.tsx

'use client';

import { useState, useEffect } from 'react';

export default function ImageZoom({ src, alt, bg }: { src?: string; alt: string; bg: string }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setZoomed(false);
    }
    if (zoomed) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [zoomed]);

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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, opacity: 0.25 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No preview available</span>
          </div>
        )}
        {src && (
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            background: 'rgba(255,255,255,0.9)', borderRadius: 6,
            padding: '4px 8px', fontSize: 11, color: 'var(--text-secondary)',
            backdropFilter: 'blur(4px)', pointerEvents: 'none'
          }}>
            Click to zoom
          </div>
        )}
      </div>

      {zoomed && (
        <div
          onClick={() => setZoomed(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', padding: 32
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ position: 'relative', maxWidth: '88vw', maxHeight: '88vh' }}
          >
            <img
              src={src}
              alt={alt}
              style={{
                maxWidth: '100%', maxHeight: '88vh',
                objectFit: 'contain', borderRadius: 12,
                boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                display: 'block'
              }}
            />
            <button
              onClick={() => setZoomed(false)}
              style={{
                position: 'absolute', top: -14, right: -14,
                width: 32, height: 32, borderRadius: '50%',
                background: 'white', border: 'none', cursor: 'pointer',
                fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#1E1810', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                lineHeight: 1
              }}
            >×</button>
          </div>
          <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            Click anywhere or press Esc to close
          </div>
        </div>
      )}
    </>
  );
}