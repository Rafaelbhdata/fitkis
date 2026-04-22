type Variant = 'primary' | 'signal' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const v: Record<Variant, string> = {
  primary:   'bg-ink text-paper border-ink hover:bg-ink-2',
  signal:    'bg-signal text-white border-signal hover:bg-signal-2',
  secondary: 'bg-white text-ink border-ink-7 hover:bg-paper-2',
  ghost:     'bg-transparent text-ink-2 border-ink-7 hover:bg-paper-2',
};
const s: Record<Size, string> = {
  sm: 'text-[11px] py-1.5 px-2.5',
  md: 'text-[13px] py-2.5 px-3.5',
  lg: 'text-sm py-3 px-[18px]',
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Btn({ variant = 'primary', size = 'md', className = '', ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border font-sans font-medium tracking-[-0.01em] transition-colors ${v[variant]} ${s[size]} ${className}`}
      {...rest}
    />
  );
}
