/* Fitkis v5 — Desktop editorial dashboard + System page */

const DesktopDash = () => (
  <div style={{width:1280, height:800, background:'var(--paper)', fontFamily:'var(--f-sans)', color:'var(--ink)', display:'flex', overflow:'hidden'}}>
    {/* Sidebar */}
    <aside style={{width:220, borderRight:'1px solid var(--ink-7)', padding:'24px 18px', display:'flex', flexDirection:'column', background:'#fff'}}>
      <FkWord size={26}/>
      <div className="fk-eyebrow" style={{marginTop:30, marginBottom:10}}>Día</div>
      <nav style={{display:'flex', flexDirection:'column', gap:2}}>
        {[
          {n:'Hoy', i:Ic.home, active:true},
          {n:'Plato', i:Ic.apple},
          {n:'Gym', i:Ic.dumb},
          {n:'Peso', i:Ic.drop},
          {n:'Sueño', i:Ic.moon},
        ].map(it => (
          <div key={it.n} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, fontSize:13, background: it.active?'var(--paper-2)':'transparent', fontWeight: it.active?500:400, color: it.active?'var(--ink)':'var(--ink-3)'}}>
            <it.i width="15" height="15"/> {it.n}
            {it.active && <div style={{marginLeft:'auto'}}><PulseLine w={20} h={6} color="var(--signal)" strokeWidth={1.2} active/></div>}
          </div>
        ))}
      </nav>
      <div className="fk-eyebrow" style={{marginTop:22, marginBottom:10}}>Mente</div>
      <nav style={{display:'flex', flexDirection:'column', gap:2}}>
        {[{n:'Hábitos', i:Ic.check},{n:'Journal', i:Ic.book},{n:'Coach', i:Ic.spark}].map(it => (
          <div key={it.n} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, fontSize:13, color:'var(--ink-3)'}}>
            <it.i width="15" height="15"/> {it.n}
          </div>
        ))}
      </nav>
      <div style={{marginTop:'auto', background:'var(--cream)', borderRadius:12, padding:'12px 14px'}}>
        <div className="fk-eyebrow" style={{marginBottom:6}}>Replay semanal</div>
        <div className="fk-serif" style={{fontSize:15, fontStyle:'italic', lineHeight:1.3}}>Listo el viernes</div>
      </div>
    </aside>

    {/* Main */}
    <main style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
      {/* top bar */}
      <div style={{padding:'20px 32px', borderBottom:'1px solid var(--ink-7)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div>
          <div className="fk-eyebrow">Martes 15 abril · 09:41</div>
          <h1 className="fk-serif" style={{fontSize:32, fontWeight:300, letterSpacing:'-0.025em', margin:'2px 0 0', lineHeight:1}}>Hola, <span style={{fontStyle:'italic'}}>Dani</span>.</h1>
        </div>
        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <div style={{display:'flex', alignItems:'center', gap:6, padding:'6px 12px', border:'1px solid var(--ink-7)', borderRadius:999, fontSize:12, color:'var(--ink-3)'}}>
            <Ic.spark width="12" height="12" color="var(--signal)"/> ⌘K
          </div>
          <Btn variant="primary" icon={<Ic.plus/>}>Registrar</Btn>
          <div style={{width:36, height:36, borderRadius:999, background:'var(--paper-3)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--f-serif)', fontWeight:500}}>D</div>
        </div>
      </div>

      <div style={{flex:1, padding:'24px 32px', overflow:'auto', display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:20}}>
        {/* LEFT column */}
        <div style={{display:'flex', flexDirection:'column', gap:20}}>
          {/* The Pulse hero */}
          <div style={{background:'var(--ink)', color:'var(--paper)', borderRadius:18, padding:'28px 32px', position:'relative', overflow:'hidden'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
              <div>
                <div className="fk-eyebrow" style={{color:'var(--ink-5)'}}>El pulso</div>
                <div style={{display:'flex', alignItems:'baseline', gap:10, marginTop:4}}>
                  <span className="fk-serif" style={{fontSize:96, fontWeight:200, letterSpacing:'-0.05em', lineHeight:0.85}}>74</span>
                  <span className="fk-mono" style={{fontSize:13, color:'var(--ink-5)', textTransform:'uppercase', letterSpacing:'0.1em'}}>/ 100</span>
                </div>
                <div className="fk-serif" style={{fontSize:17, marginTop:8, fontStyle:'italic', color:'var(--ink-6)', fontWeight:300}}>
                  Fuiste constante hoy — <span style={{color:'var(--signal)', fontStyle:'normal'}}>+4 pts</span> vs. ayer.
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <Chip tone="signal" style={{background:'rgba(255,90,31,0.15)', color:'var(--signal-2)'}}><Ic.flame width="10" height="10"/> Racha 6</Chip>
              </div>
            </div>
            <div style={{marginTop:18}}>
              <PulseLine w={700} h={44} color="var(--signal)" strokeWidth={2} active/>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:16, marginTop:18, paddingTop:18, borderTop:'1px solid rgba(255,255,255,0.1)'}}>
              {[
                {l:'Comida', v:'4/5', c:'var(--leaf)'},
                {l:'Movim.', v:'52m', c:'var(--signal)'},
                {l:'Sueño', v:'7:20', c:'var(--sky)'},
                {l:'Ánimo', v:'8', c:'var(--honey)'},
                {l:'Hábitos', v:'4/5', c:'var(--berry)'},
              ].map(m=>(
                <div key={m.l}>
                  <div style={{width:6, height:6, borderRadius:999, background:m.c, marginBottom:6}}/>
                  <div className="fk-mono" style={{fontSize:10, color:'var(--ink-5)', textTransform:'uppercase', letterSpacing:'0.1em'}}>{m.l}</div>
                  <div className="fk-serif" style={{fontSize:22, fontWeight:400, marginTop:2}}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline + Plate */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
            {/* Timeline */}
            <Card pad={22}>
              <div className="fk-eyebrow" style={{marginBottom:14}}>Línea del día</div>
              <div style={{position:'relative', paddingLeft:20}}>
                <div style={{position:'absolute', left:5, top:4, bottom:4, width:1, background:'var(--ink-7)'}}/>
                {[
                  {t:'07:20', n:'Desayuno · omelette', c:'var(--leaf)'},
                  {t:'11:00', n:'Caminata 25 min · 2.1 km', c:'var(--signal)'},
                  {t:'13:45', n:'Comida · pollo + arroz', c:'var(--leaf)'},
                  {t:'18:00', n:'Sentadilla 80×5×5', c:'var(--signal)', strong:true},
                  {t:'20:30', n:'Cena — por registrar', c:'var(--ink-6)', soft:true},
                ].map((e,i)=>(
                  <div key={i} style={{position:'relative', padding:'6px 0'}}>
                    <div style={{position:'absolute', left:-20, top:10, width:11, height:11, borderRadius:999, background: e.soft?'var(--paper)':e.c, border:'1.5px solid '+e.c}}/>
                    <div style={{display:'flex', alignItems:'baseline', gap:10}}>
                      <span className="fk-mono" style={{fontSize:11, color:'var(--ink-4)', width:44}}>{e.t}</span>
                      <span style={{fontSize:13, fontWeight: e.strong?500:400, color: e.soft?'var(--ink-5)':'var(--ink-2)'}}>{e.n}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Plate */}
            <Card pad={22}>
              <div className="fk-eyebrow" style={{marginBottom:14}}>Plato SMAE · hoy</div>
              <div style={{position:'relative', width:170, height:170, margin:'4px auto 0'}}>
                <svg width="170" height="170" viewBox="0 0 170 170">
                  <circle cx="85" cy="85" r="78" fill="#fff" stroke="var(--ink-7)"/>
                  <path d="M85 85 L85 7 A78 78 0 0 1 158 116 Z" fill="var(--leaf-soft)"/>
                  <path d="M85 85 L158 116 A78 78 0 0 1 12 116 Z" fill="var(--honey-soft)"/>
                  <path d="M85 85 L12 116 A78 78 0 0 1 85 7 Z" fill="var(--berry-soft)"/>
                  <circle cx="85" cy="85" r="78" fill="none" stroke="var(--ink)" strokeWidth="1.5"/>
                  <line x1="85" y1="85" x2="85" y2="7" stroke="var(--ink-6)"/>
                  <line x1="85" y1="85" x2="158" y2="116" stroke="var(--ink-6)"/>
                  <line x1="85" y1="85" x2="12" y2="116" stroke="var(--ink-6)"/>
                </svg>
                <div style={{position:'absolute', top:18, left:'50%', transform:'translateX(-50%)', textAlign:'center'}}>
                  <div className="fk-mono" style={{fontSize:9, color:'var(--leaf)', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600}}>Verdura</div>
                  <div className="fk-serif" style={{fontSize:20, color:'var(--leaf)'}}>3/5</div>
                </div>
                <div style={{position:'absolute', bottom:28, right:4, textAlign:'right'}}>
                  <div className="fk-mono" style={{fontSize:9, color:'#8a6411', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600}}>Cereal</div>
                  <div className="fk-serif" style={{fontSize:20, color:'#8a6411'}}>4/4</div>
                </div>
                <div style={{position:'absolute', bottom:28, left:4}}>
                  <div className="fk-mono" style={{fontSize:9, color:'var(--berry)', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600}}>Leg/Orig</div>
                  <div className="fk-serif" style={{fontSize:20, color:'var(--berry)'}}>2/3</div>
                </div>
              </div>
              <div className="fk-serif" style={{fontSize:14, fontStyle:'italic', color:'var(--ink-3)', textAlign:'center', marginTop:6}}>te faltan <span style={{color:'var(--leaf)', fontStyle:'normal'}}>2 verduras</span></div>
            </Card>
          </div>
        </div>

        {/* RIGHT column */}
        <div style={{display:'flex', flexDirection:'column', gap:20}}>
          {/* Coach whisper */}
          <Card pad={22} style={{background:'var(--cream)', border:'1px solid var(--ink-7)'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
              <FkMark size={26}/>
              <div className="fk-eyebrow">Coach · susurro</div>
            </div>
            <div className="fk-serif" style={{fontSize:22, fontWeight:400, lineHeight:1.3, letterSpacing:'-0.015em'}}>
              Tu cuerpo <span style={{fontStyle:'italic'}}>pide</span> una sesión pesada hoy. Recuperación 82, mejor HRV de la semana.
            </div>
            <div style={{display:'flex', gap:6, marginTop:14}}>
              <Btn variant="primary" size="sm">Abrir entrenamiento</Btn>
              <Btn variant="ghost" size="sm">Saltar hoy</Btn>
            </div>
          </Card>

          {/* Weight trend */}
          <Card pad={22}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:12}}>
              <div className="fk-eyebrow">Peso · 14d</div>
              <Chip tone="leaf">↓ 2.6 kg</Chip>
            </div>
            <div style={{display:'flex', alignItems:'baseline', gap:8, marginBottom:12}}>
              <span className="fk-serif" style={{fontSize:48, fontWeight:300, letterSpacing:'-0.03em', lineHeight:1}}>79.8</span>
              <span className="fk-mono" style={{fontSize:12, color:'var(--ink-4)'}}>kg</span>
            </div>
            <Spark values={[82.4,82.1,82.3,81.9,81.5,81.7,81.2,81.0,80.8,80.9,80.5,80.2,80.0,79.8]} w={360} h={70} color="var(--signal)" fill/>
          </Card>

          {/* Recovery mini */}
          <Card pad={22}>
            <div className="fk-eyebrow" style={{marginBottom:12}}>Recuperación</div>
            <div style={{display:'flex', alignItems:'center', gap:16}}>
              <svg width="70" height="70" viewBox="0 0 70 70">
                <circle cx="35" cy="35" r="28" fill="none" stroke="var(--paper-3)" strokeWidth="6"/>
                <circle cx="35" cy="35" r="28" fill="none" stroke="var(--sky)" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={2*Math.PI*28} strokeDashoffset={2*Math.PI*28*(1-0.82)} transform="rotate(-90 35 35)"/>
                <text x="35" y="40" textAnchor="middle" style={{fontFamily:'var(--f-serif)', fontSize:22, fontWeight:400, fill:'var(--ink)'}}>82</text>
              </svg>
              <div style={{flex:1}}>
                <div className="fk-serif" style={{fontSize:16, fontWeight:400, color:'var(--ink-2)'}}>Listo para <span style={{fontStyle:'italic', color:'var(--sky)'}}>empujar</span></div>
                <div style={{fontSize:11, color:'var(--ink-4)', marginTop:4}}>Sueño 7:20 · HRV estable</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  </div>
);

/* ── System page — design tokens for handoff ── */
const SystemPage = () => (
  <div style={{width:1100, background:'var(--paper)', fontFamily:'var(--f-sans)', color:'var(--ink)', padding:'50px 56px 60px'}}>
    <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:40}}>
      <div>
        <div className="fk-eyebrow">Design System · v5</div>
        <h1 className="fk-serif" style={{fontSize:72, fontWeight:300, letterSpacing:'-0.04em', margin:'2px 0 0', lineHeight:0.95}}>
          Paper &amp; <span style={{fontStyle:'italic', color:'var(--signal)'}}>Pulse</span>.
        </h1>
      </div>
      <FkMark size={60}/>
    </div>
    <p className="fk-serif" style={{fontSize:20, fontWeight:300, lineHeight:1.5, letterSpacing:'-0.01em', color:'var(--ink-2)', maxWidth:680, margin:'0 0 50px'}}>
      Editorial, cálido, con un pulso que recorre toda la app. Como una revista que entiende tu cuerpo.
    </p>

    {/* Brand row */}
    <div style={{display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:20, marginBottom:40}}>
      <Card pad={28}>
        <div className="fk-eyebrow" style={{marginBottom:18}}>Wordmark · Dark on paper</div>
        <FkWord size={56}/>
        <div style={{marginTop:24, paddingTop:24, borderTop:'1px solid var(--ink-7)', display:'flex', gap:30, alignItems:'center'}}>
          <FkMark size={56}/>
          <FkMark size={40}/>
          <FkMark size={28}/>
          <div style={{flex:1}}/>
          <div className="fk-mono" style={{fontSize:10, color:'var(--ink-4)', letterSpacing:'0.08em', textTransform:'uppercase'}}>App icon · 56/40/28</div>
        </div>
      </Card>
      <Card pad={28} style={{background:'var(--ink)'}}>
        <div className="fk-eyebrow" style={{color:'var(--ink-5)', marginBottom:18}}>On ink</div>
        <div style={{display:'inline-flex', alignItems:'baseline', gap:6, color:'var(--paper)', fontFamily:'var(--f-serif)', fontSize:56, lineHeight:1, letterSpacing:'-0.02em'}}>
          <span style={{fontStyle:'italic'}}>fitkis</span>
          <span style={{transform:'translateY(-0.15em)'}}><PulseLine w={50} h={18} color="var(--signal)" strokeWidth={2}/></span>
        </div>
      </Card>
    </div>

    {/* Palette */}
    <div className="fk-eyebrow" style={{marginBottom:14}}>Paleta</div>
    <div style={{display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:10, marginBottom:14}}>
      {[
        {n:'ink', c:'var(--ink)', hex:'#0a0a0a', fg:'var(--paper)'},
        {n:'paper', c:'var(--paper)', hex:'#fafaf7', fg:'var(--ink)', bd:true},
        {n:'cream', c:'var(--cream)', hex:'#f8f3e8', fg:'var(--ink)', bd:true},
        {n:'signal', c:'var(--signal)', hex:'#ff5a1f', fg:'#fff'},
        {n:'leaf', c:'var(--leaf)', hex:'#4a7c3a', fg:'#fff'},
        {n:'berry', c:'var(--berry)', hex:'#c13b5a', fg:'#fff'},
        {n:'honey', c:'var(--honey)', hex:'#d4a017', fg:'#fff'},
        {n:'sky', c:'var(--sky)', hex:'#3a6b8c', fg:'#fff'},
      ].map(s=>(
        <div key={s.n} style={{background:s.c, color:s.fg, borderRadius:10, padding:'16px 12px 14px', aspectRatio:'1', display:'flex', flexDirection:'column', justifyContent:'space-between', border: s.bd?'1px solid var(--ink-7)':'none'}}>
          <div className="fk-mono" style={{fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em'}}>{s.n}</div>
          <div className="fk-mono" style={{fontSize:11}}>{s.hex}</div>
        </div>
      ))}
    </div>
    <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:40}}>
      {[
        {n:'signal/soft', c:'var(--signal-soft)'},
        {n:'leaf/soft', c:'var(--leaf-soft)'},
        {n:'berry/soft', c:'var(--berry-soft)'},
        {n:'sky/soft', c:'var(--sky-soft)'},
      ].map(s=>(
        <div key={s.n} style={{background:s.c, borderRadius:10, padding:'14px 14px', border:'1px solid var(--ink-7)'}}>
          <div className="fk-mono" style={{fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--ink-3)'}}>{s.n}</div>
        </div>
      ))}
    </div>

    {/* Type */}
    <div className="fk-eyebrow" style={{marginBottom:14}}>Tipografía</div>
    <div style={{background:'#fff', border:'1px solid var(--ink-7)', borderRadius:14, padding:32, marginBottom:40, display:'flex', flexDirection:'column', gap:18}}>
      <div>
        <div className="fk-mono" style={{fontSize:10, color:'var(--ink-4)', marginBottom:4}}>Fraunces · Display · 300/italic</div>
        <div className="fk-serif" style={{fontSize:72, fontWeight:300, letterSpacing:'-0.04em', lineHeight:0.95}}>Un pulso <span style={{fontStyle:'italic'}}>constante</span>.</div>
      </div>
      <div>
        <div className="fk-mono" style={{fontSize:10, color:'var(--ink-4)', marginBottom:4}}>Fraunces · Body · 400</div>
        <div className="fk-serif" style={{fontSize:20, lineHeight:1.5}}>Comer bien, moverse, dormir y pensar.</div>
      </div>
      <div>
        <div className="fk-mono" style={{fontSize:10, color:'var(--ink-4)', marginBottom:4}}>Geist · UI · 400-600</div>
        <div className="fk-sans" style={{fontSize:17, fontWeight:500}}>Los copys de interfaz son corto, humano y con ritmo.</div>
      </div>
      <div>
        <div className="fk-mono" style={{fontSize:10, color:'var(--ink-4)', marginBottom:4}}>JetBrains Mono · Labels &amp; Data</div>
        <div className="fk-mono" style={{fontSize:13}}>MARTES · 09:41 · 79.8 KG · +2.5</div>
      </div>
    </div>

    {/* Signature */}
    <div className="fk-eyebrow" style={{marginBottom:14}}>El pulso · firma visual</div>
    <div style={{background:'#fff', border:'1px solid var(--ink-7)', borderRadius:14, padding:32, marginBottom:40}}>
      <p className="fk-serif" style={{fontSize:18, lineHeight:1.5, color:'var(--ink-2)', margin:'0 0 20px', maxWidth:700}}>
        Una línea EKG estilizada recorre la app: bajo títulos, sobre cards activas, dentro del dock. Es el hilo que une comida, gym, sueño y ánimo en un solo ritmo — <span style={{fontStyle:'italic'}}>el tuyo</span>.
      </p>
      <div style={{display:'flex', flexDirection:'column', gap:16}}>
        <PulseLine w={900} h={32} color="var(--ink)" strokeWidth={1.5}/>
        <PulseLine w={900} h={32} color="var(--signal)" strokeWidth={2} active/>
        <PulseLine w={900} h={24} color="var(--ink-5)" strokeWidth={1}/>
      </div>
    </div>

    {/* Components */}
    <div className="fk-eyebrow" style={{marginBottom:14}}>Componentes</div>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:40}}>
      <Card pad={22}>
        <div className="fk-eyebrow" style={{marginBottom:14}}>Botones</div>
        <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
          <Btn variant="primary">Primary</Btn>
          <Btn variant="signal">Signal</Btn>
          <Btn variant="secondary">Secondary</Btn>
          <Btn variant="ghost">Ghost</Btn>
        </div>
        <div style={{display:'flex', flexWrap:'wrap', gap:8, marginTop:10}}>
          <Btn variant="primary" size="sm">Small</Btn>
          <Btn variant="primary" size="md">Medium</Btn>
          <Btn variant="primary" size="lg">Large</Btn>
        </div>
      </Card>
      <Card pad={22}>
        <div className="fk-eyebrow" style={{marginBottom:14}}>Chips</div>
        <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
          <Chip tone="ink">neutral</Chip>
          <Chip tone="signal">signal</Chip>
          <Chip tone="leaf">leaf</Chip>
          <Chip tone="berry">berry</Chip>
          <Chip tone="honey">honey</Chip>
          <Chip tone="sky">sky</Chip>
          <Chip tone="inkSolid">inkSolid</Chip>
        </div>
      </Card>
      <Card pad={22}>
        <div className="fk-eyebrow" style={{marginBottom:14}}>Data · sparkline</div>
        <div style={{display:'flex', alignItems:'baseline', gap:14}}>
          <BigNum n="79.8" unit="kg" size={52}/>
          <Spark values={[82,81.5,81,80.5,80,79.8]} w={120} h={40} color="var(--signal)" fill/>
        </div>
      </Card>
      <Card pad={22}>
        <div className="fk-eyebrow" style={{marginBottom:14}}>Segments</div>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          <div><div className="fk-mono" style={{fontSize:10, marginBottom:4, color:'var(--ink-4)'}}>Verduras 3/5</div><Segments value={3} max={5} color="var(--leaf)"/></div>
          <div><div className="fk-mono" style={{fontSize:10, marginBottom:4, color:'var(--ink-4)'}}>Cereales 4/4</div><Segments value={4} max={4} color="var(--honey)"/></div>
          <div><div className="fk-mono" style={{fontSize:10, marginBottom:4, color:'var(--ink-4)'}}>Orig. animal 2/3</div><Segments value={2} max={3} color="var(--berry)"/></div>
        </div>
      </Card>
    </div>

    {/* Voice */}
    <div className="fk-eyebrow" style={{marginBottom:14}}>Tono de voz</div>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:40}}>
      <div style={{background:'var(--leaf-soft)', borderRadius:12, padding:'20px 22px'}}>
        <div className="fk-mono" style={{fontSize:10, color:'var(--leaf)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8, fontWeight:600}}>✓ Así</div>
        <div className="fk-serif" style={{fontSize:18, lineHeight:1.4, fontStyle:'italic', color:'var(--ink-2)'}}>
          "Fuiste constante hoy — tu cuerpo ya lo nota."
        </div>
      </div>
      <div style={{background:'var(--berry-soft)', borderRadius:12, padding:'20px 22px'}}>
        <div className="fk-mono" style={{fontSize:10, color:'var(--berry)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8, fontWeight:600}}>✗ Así no</div>
        <div style={{fontSize:15, lineHeight:1.5, color:'var(--ink-3)'}}>
          "¡Felicidades! ¡Has alcanzado el 85% de tu meta diaria de nutrición!"
        </div>
      </div>
    </div>

    {/* Handoff notes */}
    <div style={{background:'var(--ink)', color:'var(--paper)', borderRadius:18, padding:'32px 36px'}}>
      <div className="fk-eyebrow" style={{color:'var(--ink-5)', marginBottom:10}}>Handoff · Claude Code</div>
      <h2 className="fk-serif" style={{fontSize:32, fontWeight:300, letterSpacing:'-0.025em', margin:'0 0 20px', lineHeight:1}}>
        Para el <span style={{fontStyle:'italic'}}>desarrollo</span>.
      </h2>
      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20}}>
        {[
          {h:'Fuentes', b:'Fraunces (300,400,500, italic), Geist (400,500,600), JetBrains Mono (400,500). Google Fonts.'},
          {h:'Tokens', b:'Listos como CSS vars — drop-in en globals.css. Tailwind extiende desde ahí.'},
          {h:'Primitives', b:'FkMark, FkWord, PulseLine, Card, Chip, Btn, Spark, Segments, BigNum. Todo en kit.jsx.'},
          {h:'Motion', b:'Count-up en BigNum, fk-pulse-dot en señales vivas, fade-translate entre pantallas.'},
          {h:'Densidad', b:'Cards 14-18 rx, padding 20-28, type scale editorial. Preferir números grandes.'},
          {h:'Nav', b:'Dock pill flotante en móvil. Sidebar 220px en desktop. ⌘K global.'},
        ].map(x=>(
          <div key={x.h}>
            <div className="fk-mono" style={{fontSize:10, color:'var(--signal-2)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6, fontWeight:500}}>{x.h}</div>
            <div style={{fontSize:13, lineHeight:1.5, color:'var(--ink-6)'}}>{x.b}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

Object.assign(window, { DesktopDash, SystemPage });
