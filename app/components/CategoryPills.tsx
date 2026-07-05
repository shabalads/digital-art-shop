// app/components/CategoryPills.tsx

'use client';

import { useState, useEffect } from 'react';

export default function CategoryPills({
  active,
  onChange,
  align = 'center'
}: {
  active: string;
  onChange: (cat: string) => void;
  align?: 'center' | 'left';
}) {
  const [categories, setCategories] = useState<string[]>(['All']);

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => {
        const names = (data.categories || []).map((c: any) => c.name);
        setCategories(['All', ...names]);
      })
      .catch(() => {
        // keep just "All" if the fetch fails
      });
  }, []);

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: align === 'left' ? 'flex-start' : 'center' }}>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          style={{
            background: active === cat ? 'var(--accent)' : 'var(--bg-pill)',
            color: active === cat ? 'white' : 'var(--text-secondary)',
            border: `0.5px solid ${active === cat ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 20, padding: '6px 16px', fontSize: 13,
            cursor: 'pointer', fontWeight: active === cat ? 500 : 400,
            transition: 'all 0.15s', whiteSpace: 'nowrap'
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}