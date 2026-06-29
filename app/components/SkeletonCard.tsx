// app/components/SkeletonCard.tsx

export default function SkeletonCard() {
  return (
    <div style={{ borderRadius: 12, border: '0.5px solid var(--border-card)', overflow: 'hidden', background: 'white' }}>
      <div style={{
        aspectRatio: '3/4', background: 'var(--border)',
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ height: 13, background: 'var(--border)', borderRadius: 4, marginBottom: 8, width: '70%', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 11, background: 'var(--border)', borderRadius: 4, marginBottom: 10, width: '40%', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 13, background: 'var(--border)', borderRadius: 4, width: '30%', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}