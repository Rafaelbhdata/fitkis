# Fitkis v5 · Paper & Pulse — HANDOFF

> Instrucciones para Claude Code. Lee TODO antes de empezar. La referencia visual es `Fitkis v5.html` en la raíz del diseño.

## 0 · Contexto y filosofía

Fitkis está migrando de la v3/v4 (dark + cyan) a **v5 "Paper & Pulse"**: una app editorial, cálida, con alma. Menos dashboard genérico, más revista inteligente que entiende tu cuerpo.

**3 reglas que no se rompen:**
1. **Tipografía grande y serif italic** en cualquier momento "humano" (saludos, insights, journal, replays). Los números son enormes.
2. **El Pulso** (línea EKG estilizada) es la firma visual — aparece en el dock activo, debajo de títulos, en botones primarios, en el hero card.
3. **Copys cálidos y específicos**. Nunca "¡Has alcanzado el 85%!". Siempre "Fuiste constante hoy — tu cuerpo ya lo nota."

---

## 1 · Tokens (drop-in en `globals.css`)

```css
:root {
  /* Ink scale */
  --ink: #0a0a0a;
  --ink-2: #1a1a1a;
  --ink-3: #404040;
  --ink-4: #737373;
  --ink-5: #a3a3a3;
  --ink-6: #d4d4d4;
  --ink-7: #e5e5e5;

  /* Paper */
  --paper: #fafaf7;
  --paper-2: #f5f4ef;
  --paper-3: #eceae2;
  --cream: #f8f3e8;

  /* Accent + semantics */
  --signal: #ff5a1f;        /* mandarina — hero accent */
  --signal-2: #ff7a44;
  --signal-soft: #ffe8dd;
  --leaf: #4a7c3a;   --leaf-soft: #e4ecd6;    /* verdura / OK */
  --berry: #c13b5a;  --berry-soft: #f6dde2;   /* origen animal / alerta */
  --honey: #d4a017;  --honey-soft: #f5ead0;   /* cereal / calidez */
  --sky: #3a6b8c;    --sky-soft: #dbe6ef;    /* recovery / info */

  /* Fonts */
  --f-serif: 'Fraunces', 'Times New Roman', serif;
  --f-sans:  'Geist', ui-sans-serif, system-ui, sans-serif;
  --f-mono:  'JetBrains Mono', ui-monospace, 'SF Mono', monospace;

  /* Radii */
  --r-sm: 8px;
  --r-md: 12px;
  --r-lg: 14px;
  --r-xl: 18px;
  --r-2xl: 22px;
}

html, body { background: var(--paper); color: var(--ink); font-family: var(--f-sans); }
```

### Utilities
```css
.fk-serif { font-family: var(--f-serif); font-optical-sizing: auto; }
.fk-mono  { font-family: var(--f-mono); font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }
.fk-num   { font-family: var(--f-mono); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.fk-eyebrow { font-family: var(--f-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-4); font-weight: 500; }

@keyframes fk-pulse { 0%,100% {opacity:1} 50% {opacity:0.4} }
.fk-pulse-dot { animation: fk-pulse 2s ease-in-out infinite; }
```

---

## 2 · Fuentes (Next.js `app/layout.tsx`)

```tsx
import { Fraunces, Geist, JetBrains_Mono } from 'next/font/google';

const fraunces = Fraunces({
  subsets: ['latin'], variable: '--f-serif',
  weight: ['300','400','500'], style: ['normal','italic'],
});
const geist = Geist({ subsets: ['latin'], variable: '--f-sans', weight: ['300','400','500','600','700'] });
const jbm = JetBrains_Mono({ subsets: ['latin'], variable: '--f-mono', weight: ['400','500','600'] });

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${geist.variable} ${jbm.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

Borrar cualquier otra fuente anterior (Inter, Roboto, etc).

---

## 3 · Tailwind (drop-in `tailwind.config.ts`)

```ts
export default {
  theme: {
    extend: {
      colors: {
        ink:    { DEFAULT:'#0a0a0a', 2:'#1a1a1a', 3:'#404040', 4:'#737373', 5:'#a3a3a3', 6:'#d4d4d4', 7:'#e5e5e5' },
        paper:  { DEFAULT:'#fafaf7', 2:'#f5f4ef', 3:'#eceae2' },
        cream:  '#f8f3e8',
        signal: { DEFAULT:'#ff5a1f', 2:'#ff7a44', soft:'#ffe8dd' },
        leaf:   { DEFAULT:'#4a7c3a', soft:'#e4ecd6' },
        berry:  { DEFAULT:'#c13b5a', soft:'#f6dde2' },
        honey:  { DEFAULT:'#d4a017', soft:'#f5ead0' },
        sky:    { DEFAULT:'#3a6b8c', soft:'#dbe6ef' },
      },
      fontFamily: {
        serif: ['var(--f-serif)', 'serif'],
        sans:  ['var(--f-sans)', 'system-ui'],
        mono:  ['var(--f-mono)', 'monospace'],
      },
      borderRadius: { sm:'8px', md:'12px', lg:'14px', xl:'18px','2xl':'22px' },
    },
  },
}
```

---

## 4 · Componentes nuevos (crear en `components/ui/`)

### `PulseLine.tsx` — firma visual, úsala en TODO
```tsx
export function PulseLine({ w=120, h=24, color='currentColor', strokeWidth=1.5, active=false }) {
  const pts = [[0,h/2],[w*0.25,h/2],[w*0.32,h*0.2],[w*0.38,h*0.85],[w*0.44,h*0.1],[w*0.5,h/2],[w*0.72,h/2],[w*0.78,h*0.35],[w*0.82,h/2],[w,h/2]];
  const d = pts.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      <path d={d} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {active && <circle cx={w*0.82} cy={h/2} r="2.5" fill={color} className="fk-pulse-dot"/>}
    </svg>
  );
}
```

### `FkMark.tsx` + `FkWord.tsx` — logo
```tsx
export function FkMark({ size=48 }) {
  return (
    <div style={{width:size, height:size, borderRadius:size*0.22}}
      className="bg-ink flex items-center justify-center relative text-paper font-serif italic">
      <span style={{fontSize: size*0.48, lineHeight:1}}>f</span>
      <div style={{position:'absolute', bottom:size*0.18, left:size*0.15, right:size*0.15}}>
        <PulseLine w={size*0.7} h={size*0.18} color="#ff5a1f" strokeWidth={1.5}/>
      </div>
    </div>
  );
}

export function FkWord({ size=32 }) {
  return (
    <span className="inline-flex items-baseline font-serif" style={{fontSize:size, gap:size*0.12, letterSpacing:'-0.02em', lineHeight:1}}>
      <span className="italic">fitkis</span>
      <span style={{transform:'translateY(-0.15em)'}}>
        <PulseLine w={size*0.9} h={size*0.32} color="#ff5a1f" strokeWidth={1.8}/>
      </span>
    </span>
  );
}
```

### `Chip.tsx`
```tsx
const tones = {
  ink:      'bg-paper-3 text-ink-2',
  signal:   'bg-signal-soft text-[#a33a0f]',
  leaf:     'bg-leaf-soft text-leaf',
  berry:    'bg-berry-soft text-berry',
  honey:    'bg-honey-soft text-[#8a6411]',
  sky:      'bg-sky-soft text-sky',
  inkSolid: 'bg-ink text-paper',
};
export function Chip({ tone='ink', children, className='' }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-mono font-medium tracking-[0.06em] uppercase ${tones[tone]} ${className}`}>{children}</span>;
}
```

### `Btn.tsx`
```tsx
const vs = {
  primary:   'bg-ink text-paper border-ink',
  signal:    'bg-signal text-white border-signal',
  secondary: 'bg-white text-ink border-ink-7',
  ghost:     'bg-transparent text-ink-2 border-ink-7',
};
const sz = { sm:'text-[11px] py-1.5 px-2.5', md:'text-[13px] py-2.5 px-3.5', lg:'text-sm py-3 px-4.5' };
export function Btn({ variant='primary', size='md', className='', ...p }) {
  return <button className={`inline-flex items-center justify-center gap-1.5 rounded-full border font-medium tracking-[-0.01em] ${vs[variant]} ${sz[size]} ${className}`} {...p}/>;
}
```

### `Spark.tsx` — sparkline
```tsx
export function Spark({ values, w=120, h=32, color='currentColor', fill=false }) {
  const min=Math.min(...values), max=Math.max(...values), r=max-min||1;
  const pts = values.map((v,i)=>[(i/(values.length-1))*w, h-((v-min)/r)*(h-4)-2]);
  const d = pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const last = pts[pts.length-1];
  return (
    <svg width={w} height={h}>
      {fill && <path d={d+` L${w} ${h} L0 ${h} Z`} fill={color} opacity={0.1}/>}
      <path d={d} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color}/>
    </svg>
  );
}
```

### `BigNum.tsx` — hero number
```tsx
export function BigNum({ n, unit, size=72 }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-serif font-light" style={{fontSize:size, letterSpacing:'-0.04em', lineHeight:0.9}}>{n}</span>
      {unit && <span className="font-mono text-ink-4 uppercase tracking-[0.08em]" style={{fontSize:Math.max(10,size*0.14)}}>{unit}</span>}
    </div>
  );
}
```

### `Segments.tsx` — para SMAE, hábitos
```tsx
export function Segments({ value, max, color='#0a0a0a', h=3, gap=2 }) {
  return (
    <div className="flex items-center" style={{gap}}>
      {Array.from({length:max}).map((_,i)=>(
        <div key={i} className="flex-1 rounded-full" style={{height:h, background: i<value ? color : '#e5e5e5'}}/>
      ))}
    </div>
  );
}
```

---

## 5 · Navegación (CRÍTICO — cambia completo)

### Mobile: **Dock pill flotante negro** (reemplaza bottom tab anterior)
Especificación:
- Posición: `fixed bottom-[18px] left-4 right-4 h-[60px]`
- Bg: `var(--ink)`, `rounded-full`, shadow: `0 14px 40px rgba(10,10,10,0.25)`
- 5 slots: **Hoy · Plato · Log (FAB central) · Gym · Tú**
- El **Log central** es círculo mandarina de 46px con glow, `+` blanco
- El activo tiene **PulseLine EKG de 20×6 encima del icono** — no un underline, eso es lo memorable
- Íconos 18px, label mono 9px uppercase letter-spaced

### Desktop: Sidebar 220px
- Fondo blanco, borde derecho `border-ink-7`
- Wordmark `FkWord size={26}` arriba
- Secciones con eyebrows: "Día" (Hoy, Plato, Gym, Peso, Sueño) y "Mente" (Hábitos, Journal, Coach)
- Item activo: bg `var(--paper-2)`, a la derecha un PulseLine mini de 20×6
- Al fondo: card cream "Replay semanal · Listo el viernes"

---

## 6 · Páginas — refactor pantalla por pantalla

Orden recomendado (refactor una a la vez, commit chico, verificar):

### 6.1 `/` Home · **la pantalla insignia**
- Greeting: eyebrow fecha, h1 Fraunces 300 "Hola, *Dani*." (el nombre italic)
- Frase contextual serif italic 17px: *"Llevas 6 días moviéndote. Tu cuerpo ya lo nota."* — con los días en mandarina
- **Hero card negro** "Tu pulso · hoy":
  - Número gigante Fraunces 64 (ej: 74) con "/100" en mono al lado
  - Chip racha arriba derecha
  - **PulseLine 280×36 activa mandarina** cruzando la card
  - Grid de 4 micro-stats (Comida, Movim., Sueño, Ánimo) con dot de color + label mono + número serif 18
- Sección "Lo que sigue": 3 rows con icono en square soft-tone, título, meta mono

### 6.2 `/alimentacion` Plato SMAE
- Hero cream card: eyebrow "SMAE · Plato del Bien Comer", h2 serif "Vas por *buen camino*, te faltan dos verduras"
- **Plato circular SVG tripartito** (190px) con 3 wedges soft: leaf/honey/berry. Labels con números grandes serif dentro de cada wedge
- Lista de comidas con tiempo mono a la izquierda, chips V/C/O a la derecha

### 6.3 `/gym/session` Entrenamiento (fondo ink)
- Card de timer: "Descanso" con número serif 52 "01:24" + PulseLine mandarina activa
- "Ejercicio 2/5" eyebrow, h2 serif "Sentadilla *trasera*"
- **Tabla de sets** con grid custom: SET · PESO · REPS · RPE · ✓
  - Fila current con bg rgba(255,90,31,0.08) y número mandarina
  - Done: círculo con check relleno signal
- Comparación con sesión pasada: row sutil con sparkline mandarina "+2.5 kg vs. sesión pasada"
- FAB bottom: "Registrar serie · 80 × 5 →" en signal

### 6.4 `/peso` Peso
- Hero: número serif 88 "79.8 kg" + chip leaf "↓ 2.6 kg"
- Card chart: tabs 7D/1M/6M/1A, prom 7 días, sparkline fill mandarina 300×120
- Row negro CTA registrar peso
- **Card insight** leaf-soft: eyebrow "✧ Patrón", serif "Bajas consistentemente los *lunes*. Tu domingo hidrata bien."

### 6.5 `/habitos` Hábitos
- h2 serif "Pequeñas *constantes*."
- Grid 2 cards: Racha (ink, número serif 6, barras 8 días) + Esta semana (cream, número serif 84%)
- Lista de hábitos: checkbox círculo relleno al done, nombre + **tira de 7 mini-squares semanales** (signal si cumplió)

### 6.6 `/journal` Journal (fondo cream)
- Eyebrow + fecha
- **3 prompts numerados** (pill 18px ink/paper), respuestas serif 18 con border-left de 2px mandarina
- Empty state: serif italic 17 gris "Escribe algo pequeño…"
- Al fondo: Mood scale de 10 barras, la del valor seleccionado más alta, label central serif italic "8 · bien"

### 6.7 `/coach` Coach IA (NUEVA PANTALLA)
- Header: FkMark 32 + "Coach" + dot verde pulsante "escuchando"
- Bubbles:
  - Bot: bg blanco border ink-7 radius `14px 14px 14px 4px`, texto **serif 17** (no sans, importante)
  - User: bg ink, texto paper sans 14, radius `14px 14px 4px 14px`
- Bot puede embeder mini-card (ej: progresión sugerida con CTA "Aceptar")
- Suggested replies: fila de Chips ink clickables
- Composer pill: input "Escribe o habla…" + FAB mandarina mic

### 6.8 `/recovery` Recovery (NUEVA)
- Hero sky-soft card: **ring SVG** con score grande serif al centro (ej: 82)
- Frase serif "Listo para *empujar*." — contextual
- Lista factores: icono en círculo paper-2, nombre + descripción, delta serif a la derecha (leaf/+ o berry/−)
- Card ink al fondo: "Sugerencia de hoy — Ve a fondo en la sentadilla"

### 6.9 `/replay` Replay semanal (NUEVA, bg ink)
- PulseLine mandarina arriba
- Eyebrow "Semana 15 · Replay", h1 Fraunces 44 "Una semana de *ti*."
- Grid 2×2 de stat cards (pasos, kg movidos, sueño, plato lleno)
- Card mandarina "✧ Momento de la semana" con quote serif italic
- Bottom: botones Compartir (outline) + "Siguiente semana →" (signal)

### 6.10 `/dashboard` Desktop
Layout 1280 con sidebar 220 + main:
- Top bar: eyebrow fecha + h1 "Hola, *Dani*." + ⌘K chip + Btn primary Registrar + avatar
- Grid `1.4fr 1fr`:
  - **LEFT**: hero ink card (El Pulso, número 96, PulseLine 700×44, 5 micro-stats) → row de 2 cards (Timeline del día con nodos color + Plato SMAE)
  - **RIGHT**: Coach whisper (cream card con frase larga serif + 2 botones) → Peso trend (número 48 + sparkline) → Recovery mini (ring 70 + frase serif)

---

## 7 · Sheet de registro rápido (modal bottom)

Disparado por el FAB central del dock. Overlay dim + sheet paper con border-radius superior.
- Handle bar arriba
- h2 serif "¿Qué *pasó*?"
- **Row negro**: FAB signal mic + "Mantén para hablar" + mini PulseLine — la CTA principal
- Grid 2×2 de tiles blancos: Foto de plato · Serie gym · Peso/Agua · Journal — cada uno con icono soft, título 13 + eyebrow mono
- Sección "Recientes" con 3 chips de los últimos registros (un tap para repetir)

---

## 8 · Tono de voz (pasalo a copy team)

| ✓ Así | ✗ Así no |
|---|---|
| "Fuiste constante hoy — tu cuerpo ya lo nota." | "¡Has alcanzado el 85% de tu meta diaria!" |
| "Te faltan **2 verduras**." | "Nutrición: incompleta ⚠️" |
| "Bajas consistentemente los *lunes*." | "Weekly summary available" |
| "Listo para **empujar**." | "Recovery status: ready" |

Reglas:
- Segunda persona, mexicana, cálida, concreta
- **Nunca** emojis en copys de UI (excepto ✧ para insights y ✓ para confirmación)
- Números específicos > adjetivos genéricos
- Un italic por frase max (enfatiza lo humano)

---

## 9 · Plan de migración (hacer en ramas chicas)

`redesign/v5-paper-pulse` como rama madre, después:

1. `v5/tokens-fonts` — globals.css, layout.tsx, tailwind.config.ts
2. `v5/primitives` — PulseLine, FkMark, FkWord, Chip, Btn, Spark, BigNum, Segments
3. `v5/nav-mobile-dock` — reemplazar bottom tab por dock flotante
4. `v5/nav-desktop-sidebar` — refactor sidebar
5. `v5/home` — pantalla insignia
6. `v5/plato-smae` — plato circular
7. `v5/gym-session` — ink theme + set table
8. `v5/peso-trend` — chart + insight card
9. `v5/habitos` — lista con squares semanales
10. `v5/journal` — cream + prompts serif
11. `v5/quick-log-sheet` — FAB sheet
12. `v5/coach-ia` — pantalla nueva
13. `v5/recovery` — pantalla nueva
14. `v5/replay-weekly` — pantalla nueva + share
15. `v5/dashboard-desktop` — layout editorial

Después de cada rama: `npm run build` + `npx tsc --noEmit` + screenshot contra `Fitkis v5.html` + PR al mentor antes de mergear.

---

## 10 · Checklist de calidad (antes de cerrar)

- [ ] No quedan restos de cyan/pink de v4 (`grep -r "22e4d9\|ff5277" src/`)
- [ ] No quedan Inter/Roboto/Arial en código
- [ ] Todo número "hero" (>40px) es Fraunces light
- [ ] Todo label/timestamp/data es JetBrains Mono con `tabular-nums`
- [ ] El PulseLine aparece al menos en: dock activo, hero Home, gym timer, sidebar desktop
- [ ] Copys revisados — no hay "¡Felicidades!" ni porcentajes sin contexto
- [ ] Mobile: dock flotante no overlapa contenido (padding-bottom: 96 en scroll areas)
- [ ] Dark mode: por ahora NO implementar. La gracia de v5 es el paper cálido.

---

## 11 · Cómo probar mientras desarrollas

Abre `Fitkis v5.html` del diseño al lado del dev server. Es pixel-reference. Si algo se ve distinto, el diseño manda. Si tienes duda, pregunta con screenshot del diff — no interpretes.
