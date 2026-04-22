/* ======================================================
   Fitkis v5 · Kit · brand + primitives + icons
   ====================================================== */

const Ic = {
  plus:   (p={}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  check:  (p={}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  arrow:  (p={}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  chevR:  (p={}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="9 18 15 12 9 6"/></svg>,
  chevL:  (p={}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="15 18 9 12 15 6"/></svg>,
  chevD:  (p={}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="6 9 12 15 18 9"/></svg>,
  mic:    (p={}) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/></svg>,
  cam:    (p={}) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>,
  dumb:   (p={}) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12"/></svg>,
  apple:  (p={}) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/></svg>,
  moon:   (p={}) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  book:   (p={}) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  spark:  (p={}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/></svg>,
  settings:(p={}) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8L7 17M17 7l2.8-2.8"/></svg>,
  play:   (p={}) => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" {...p}><polygon points="6 4 20 12 6 20"/></svg>,
  drop:   (p={}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>,
  flame:  (p={}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,
  home:   (p={}) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,
  grid:   (p={}) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  share:  (p={}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>,
};

/* ── The Pulse — our signature visual motif ─────── */
const PulseLine = ({ w=120, h=24, color='#0a0a0a', strokeWidth=1.5, phase=0, active=false }) => {
  // A stylized heartbeat/EKG line — used throughout the product as brand
  const pts = [
    [0, h/2],[w*0.25, h/2],
    [w*0.32, h*0.2],[w*0.38, h*0.85],
    [w*0.44, h*0.1],[w*0.5, h/2],
    [w*0.72, h/2],[w*0.78, h*0.35],
    [w*0.82, h/2],[w, h/2]
  ];
  const d = pts.map((p,i)=> (i===0?'M':'L')+p[0]+' '+p[1]).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
      <path d={d} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {active && <circle cx={w*0.82} cy={h/2} r="2.5" fill={color} className="fk-pulse-dot"/>}
    </svg>
  );
};

/* ── Wordmark ── */
const FkWord = ({ size=32, color='var(--ink)' }) => (
  <span style={{display:'inline-flex', alignItems:'baseline', gap: size*0.12, color, fontFamily:'var(--f-serif)', fontSize:size, lineHeight:1, fontWeight:400, letterSpacing:'-0.02em'}}>
    <span style={{fontStyle:'italic'}}>fitkis</span>
    <span style={{display:'inline-block', transform:'translateY(-0.15em)'}}>
      <PulseLine w={size*0.9} h={size*0.32} color="var(--signal)" strokeWidth={1.8}/>
    </span>
  </span>
);

const FkMark = ({ size=48, bg='var(--ink)', fg='var(--paper)', accent='var(--signal)' }) => (
  <div style={{width:size, height:size, background:bg, borderRadius: size*0.22, display:'flex', alignItems:'center', justifyContent:'center', color:fg, fontFamily:'var(--f-serif)', fontSize: size*0.48, fontStyle:'italic', fontWeight:400, position:'relative'}}>
    f
    <div style={{position:'absolute', bottom: size*0.18, left: size*0.15, right: size*0.15}}>
      <PulseLine w={size*0.7} h={size*0.18} color={accent} strokeWidth={1.5}/>
    </div>
  </div>
);

/* ── Card ── */
const Card = ({ children, pad=16, style={}, ...r }) => (
  <div style={{background:'#fff', border:'1px solid var(--ink-7)', borderRadius:14, padding:pad, ...style}} {...r}>{children}</div>
);

/* ── Chip ── */
const Chip = ({ children, tone='ink', style={} }) => {
  const t = {
    ink: {bg:'var(--paper-3)', fg:'var(--ink-2)'},
    signal: {bg:'var(--signal-soft)', fg:'#a33a0f'},
    leaf: {bg:'var(--leaf-soft)', fg:'var(--leaf)'},
    berry: {bg:'var(--berry-soft)', fg:'var(--berry)'},
    honey: {bg:'var(--honey-soft)', fg:'#8a6411'},
    sky: {bg:'var(--sky-soft)', fg:'var(--sky)'},
    inkSolid: {bg:'var(--ink)', fg:'var(--paper)'},
  }[tone];
  return <span style={{display:'inline-flex', alignItems:'center', gap:4, background:t.bg, color:t.fg, fontSize:10, fontFamily:'var(--f-mono)', letterSpacing:'0.06em', textTransform:'uppercase', fontWeight:500, padding:'3px 8px', borderRadius:999, ...style}}>{children}</span>;
};

/* ── Button ── */
const Btn = ({ children, variant='primary', size='md', icon, style={}, onClick }) => {
  const v = {
    primary: {bg:'var(--ink)', fg:'var(--paper)', bd:'var(--ink)'},
    signal:  {bg:'var(--signal)', fg:'#fff', bd:'var(--signal)'},
    ghost:   {bg:'transparent', fg:'var(--ink-2)', bd:'var(--ink-7)'},
    secondary:{bg:'#fff', fg:'var(--ink)', bd:'var(--ink-7)'},
  }[variant];
  const s = {sm:{f:11,py:6,px:10}, md:{f:13,py:10,px:14}, lg:{f:14,py:13,px:18}}[size];
  return <button onClick={onClick} style={{display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, background:v.bg, color:v.fg, border:`1px solid ${v.bd}`, borderRadius:999, padding:`${s.py}px ${s.px}px`, fontSize:s.f, fontFamily:'var(--f-sans)', fontWeight:500, letterSpacing:'-0.01em', cursor:'pointer', ...style}}>{icon}{children}</button>;
};

/* ── Sparkline ── */
const Spark = ({ values, w=120, h=32, color='var(--ink)', fill=false, dotted=false }) => {
  const min=Math.min(...values), max=Math.max(...values), r=max-min||1;
  const pts = values.map((v,i)=>[(i/(values.length-1))*w, h - ((v-min)/r)*(h-4) -2]);
  const d = pts.map((p,i)=>(i===0?'M':'L')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  return <svg width={w} height={h} style={{display:'block'}}>
    {fill && <path d={d+` L${w} ${h} L0 ${h} Z`} fill={color} opacity="0.1"/>}
    <path d={d} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dotted?'3 3':'0'}/>
    <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2.5" fill={color}/>
  </svg>;
};

/* ── Segment meter — for macros / food groups, clean pill ── */
const Segments = ({ value, max, color='var(--ink)', h=3, gap=2 }) => {
  const segs = [];
  for (let i=0; i<max; i++){
    segs.push(<div key={i} style={{flex:1, height:h, borderRadius:h, background: i<value ? color : 'var(--ink-7)'}}/>);
  }
  return <div style={{display:'flex', gap, alignItems:'center'}}>{segs}</div>;
};

/* ── BigNumber with count-up look ── */
const BigNum = ({ n, unit, size=72, color='var(--ink)' }) => (
  <div style={{display:'flex', alignItems:'baseline', gap:6, color}}>
    <span className="fk-serif" style={{fontSize:size, fontWeight:300, letterSpacing:'-0.04em', lineHeight:0.9}}>{n}</span>
    {unit && <span className="fk-mono" style={{fontSize: Math.max(10, size*0.14), color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'0.08em'}}>{unit}</span>}
  </div>
);

Object.assign(window, { Ic, PulseLine, FkWord, FkMark, Card, Chip, Btn, Spark, Segments, BigNum });
