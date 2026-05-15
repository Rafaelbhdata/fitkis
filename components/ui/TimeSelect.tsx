import { TIME_OPTIONS } from '@/lib/clinic/calendar-utils'

export function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          background: 'var(--paper)',
          border: '1px solid var(--ink-7)',
          borderRadius: 7,
          padding: '5px 24px 5px 9px',
          fontFamily: 'var(--f-mono)',
          fontSize: 12,
          color: 'var(--ink)',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <svg
        viewBox="0 0 24 24" width={10} height={10} fill="none"
        stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--ink-5)' }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  )
}
