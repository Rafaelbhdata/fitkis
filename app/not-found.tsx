import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-sans)', gap: 16 }}>
      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-4)' }}>404</span>
      <h1 style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: 32, margin: 0, color: 'var(--ink)' }}>Página no encontrada</h1>
      <Link href="/" style={{ fontSize: 14, color: 'var(--signal)', textDecoration: 'none' }}>← Volver al inicio</Link>
    </div>
  )
}
