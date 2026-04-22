type Tone = 'ink' | 'signal' | 'leaf' | 'berry' | 'honey' | 'sky' | 'inkSolid';

const tones: Record<Tone, string> = {
  ink:      'bg-paper-3 text-ink-2',
  signal:   'bg-signal-soft text-[#a33a0f]',
  leaf:     'bg-leaf-soft text-leaf',
  berry:    'bg-berry-soft text-berry',
  honey:    'bg-honey-soft text-[#8a6411]',
  sky:      'bg-sky-soft text-sky',
  inkSolid: 'bg-ink text-paper',
};

export function Chip({
  tone = 'ink',
  children,
  className = '',
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-mono font-medium tracking-[0.06em] uppercase ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
