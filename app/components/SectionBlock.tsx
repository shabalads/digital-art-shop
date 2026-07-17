// app/components/SectionBlock.tsx

'use client';

import { useState, useEffect } from 'react';
import { Product } from '../data/products';
import ProductCard from './ProductCard';

export default function SectionBlock({ sectionId, sectionName }: { sectionId: string; sectionName: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/products?section=${sectionId}&limit=50`)
      .then(r => r.json())
      .then(data => setProducts(data.products || []))
      .finally(() => setLoaded(true));
  }, [sectionId]);

  if (loaded && products.length === 0) return null;

  return (
    <div style={{ padding: '64px clamp(20px, 4vw, 40px) 0', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, letterSpacing: '-0.5px' }}>{sectionName}</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}