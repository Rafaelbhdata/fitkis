import { PulseLine } from './PulseLine';

export function FkMark({ size = 48 }: { size?: number }) {
  return (
    <div
      className="bg-ink text-paper flex items-center justify-center relative font-serif italic"
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
    >
      <span style={{ fontSize: size * 0.48, lineHeight: 1, fontWeight: 400 }}>f</span>
      <div style={{ position: 'absolute', bottom: size * 0.18, left: size * 0.15, right: size * 0.15 }}>
        <PulseLine w={size * 0.7} h={size * 0.18} color="#ff5a1f" strokeWidth={1.5} />
      </div>
    </div>
  );
}

export function FkWord({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-baseline font-serif"
      style={{ fontSize: size, gap: size * 0.12, letterSpacing: '-0.02em', lineHeight: 1, fontWeight: 400 }}
    >
      <span className="italic">fitkis</span>
      <span style={{ transform: 'translateY(-0.15em)', display: 'inline-block' }}>
        <PulseLine w={size * 0.9} h={size * 0.32} color="#ff5a1f" strokeWidth={1.8} />
      </span>
    </span>
  );
}
