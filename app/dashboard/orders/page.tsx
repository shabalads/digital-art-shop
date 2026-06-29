// app/dashboard/orders/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Order = {
  id: string;
  customer_email: string;
  type: string;
  status: string;
  total: number;
  printful_order_id: string | null;
  created_at: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      const res = await fetch('/api/orders');
      const data = await res.json();
      setOrders(data.orders || []);
      setLoading(false);
    }
    fetchOrders();
  }, []);

  return (
    <div style={{ padding: '40px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>← Dashboard</Link>
      <h1 style={{ fontSize: 26, fontWeight: 500, marginBottom: 8 }}>Orders</h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>{orders.length} total</p>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</p>
      ) : orders.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No orders yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
              {['Date', 'Email', 'Type', 'Total', 'Status', 'Printful ID'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                <td style={{ padding: '12px' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '12px' }}>{o.customer_email}</td>
                <td style={{ padding: '12px', textTransform: 'capitalize' }}>{o.type}</td>
                <td style={{ padding: '12px' }}>${o.total.toFixed(2)}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    fontSize: 11, borderRadius: 4, padding: '2px 8px',
                    background: o.status === 'paid' ? '#DCE8DC' : o.status === 'fulfilled' ? '#E1F5EE' : o.status === 'failed' ? '#FCEBEB' : '#F0EBE3',
                    color: o.status === 'paid' ? '#3B6D11' : o.status === 'fulfilled' ? '#0F6E56' : o.status === 'failed' ? '#A32D2D' : '#8B7355'
                  }}>
                    {o.status}
                  </span>
                </td>
                <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{o.printful_order_id || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}