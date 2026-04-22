/* Fitkis v5 — Mobile screens (1-4) */

const PhoneFrame = ({ children, bg='var(--paper)' }) => (
  <div style={{width:340, height:720, background:bg, position:'relative', overflow:'hidden', fontFamily:'var(--f-sans)', color:'var(--ink)'}}>
    {/* status bar */}
    <div style={{position:'absolute', top:0, left:0, right:0, height:44, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 22px', fontSize:13, fontWeight:600, fontFamily:'var(--f-mono)', zIndex:20}}>
      <span>9:41</span>
      <span style={{display:'flex', gap:4, alignItems:'center'}}>
        <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><rect x="0" y="3" width="3" height="7" rx="0.5"/><rect x="4.3" y="2" width="3" height="8" rx="0.5"/><rect x="8.6" y="1" width="3" height="9" rx="0.5"/><rect x="12.9" y="0" width="3" height="10" rx="0.5"/></svg>
        <svg width="22" height="11" viewBox="0 0 22 11" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="18" height="10" rx="2"/><rect x="2" y="2" width="14" height="7" rx="1" fill="currentColor"/><rect x="19.5" y="3.5" width="1.5" height="4" rx="0.5" fill="currentColor"/></svg>
      </span>
    </div>
    {children}
  </div>
);

/* Dock — nav con firma: pill que se expande, indicator viaja con EKG */
const Dock = ({ active='home' }) => {
  const items = [
    {id:'home', icon:Ic.home, label:'Hoy'},
    {id:'food', icon:Ic.apple, label:'Plato'},
    {id:'add', icon:Ic.plus, label:'Log', primary:true},
    {id:'gym', icon:Ic.dumb, label:'Gym'},
    {id:'you', icon:Ic.grid, label:'Tú'},
  ];
  return (
    <div style={{position:'absolute', bottom:18, left:16, right:16, height:60, background:'var(--ink)', borderRadius:999, display:'flex', alignItems:'center', justifyContent:'space-around', padding:'0 10px', boxShadow:'0 14px 40px rgba(10,10,10,0.25)', zIndex:30}}>
      {items.map(it => {
        const isActive = it.id === active;
        if (it.primary) {
          return (
            <div key={it.id} style={{width:46, height:46, background:'var(--signal)', borderRadius:999, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', boxShadow:'0 4px 12px rgba(255,90,31,0.4)'}}>
              <it.icon width="20" height="20"/>
            </div>
          );
        }
        return (
          <div key={it.id} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:3, color: isActive ? 'var(--paper)' : 'var(--ink-5)', position:'relative'}}>
            <it.icon width="18" height="18"/>
            <span style={{fontSize:9, fontFamily:'var(--f-mono)', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:500}}>{it.label}</span>
            {isActive && <div style={{position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)'}}><PulseLine w={20} h={6} color="var(--signal)" strokeWidth={1.3} active/></div>}
          </div>
        );
      })}
    </div>
  );
};

/* ── 1. Login / Bienvenida ── */
const ScreenLogin = () => (
  <PhoneFrame bg="var(--paper)">
    <div style={{position:'absolute', top:0, right:0, width:260, height:260, background:'var(--signal)', borderRadius:'0 0 0 100%', opacity:0.9}}/>
    <div style={{position:'absolute', top:70, left:24}}>
      <FkMark size={56}/>
    </div>
    <div style={{position:'absolute', top:280, left:24, right:24}}>
      <div className="fk-eyebrow" style={{marginBottom:16}}>01 · Bienvenida</div>
      <h1 className="fk-serif" style={{fontSize:52, fontWeight:300, lineHeight:0.95, letterSpacing:'-0.035em', margin:0}}>
        Un pulso<br/>para tu <span style={{fontStyle:'italic', color:'var(--signal)'}}>vida</span><br/>diaria.
      </h1>
      <p style={{marginTop:18, fontSize:14, color:'var(--ink-3)', lineHeight:1.5, maxWidth:260}}>
        Comer bien, entrenar, dormir, pensar. Fitkis los une en un solo ritmo — el tuyo.
      </p>
    </div>
    <div style={{position:'absolute', bottom:40, left:24, right:24, display:'flex', flexDirection:'column', gap:10}}>
      <Btn variant="primary" size="lg" style={{width:'100%', justifyContent:'space-between'}}>
        <span>Empezar <span style={{color:'var(--ink-5)', fontWeight:400}}>· 2 min</span></span>
        <Ic.arrow width="16" height="16"/>
      </Btn>
      <button style={{background:'transparent', border:'none', color:'var(--ink-4)', fontSize:13, fontFamily:'var(--f-sans)', padding:10, cursor:'pointer'}}>
        Ya tengo cuenta
      </button>
    </div>
  </PhoneFrame>
);

/* ── 2. Home / Hoy — la pantalla insignia ── */
const ScreenHome = () => (
  <PhoneFrame>
    <div className="fk-scroll" style={{position:'absolute', inset:'44px 0 96px', overflowY:'auto'}}>
      {/* Greeting block — layout asimétrico */}
      <div style={{padding:'20px 20px 24px'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18}}>
          <div>
            <div className="fk-eyebrow">Martes · 15 abr</div>
            <h1 className="fk-serif" style={{fontSize:36, fontWeight:300, letterSpacing:'-0.03em', margin:'2px 0 0', lineHeight:1}}>
              Hola, <span style={{fontStyle:'italic'}}>Dani</span>.
            </h1>
          </div>
          <div style={{width:40, height:40, borderRadius:999, background:'var(--paper-3)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--f-serif)', fontSize:16, fontWeight:500}}>D</div>
        </div>
        <p className="fk-serif" style={{fontSize:17, lineHeight:1.4, margin:0, color:'var(--ink-2)', fontStyle:'italic', fontWeight:300, maxWidth:260}}>
          "Llevas <span style={{fontStyle:'normal', color:'var(--signal)', fontWeight:500}}>6 días</span> moviéndote. Tu cuerpo ya lo nota."
        </p>
      </div>

      {/* The Pulse — hero card with EKG ribbon */}
      <div style={{margin:'0 20px', background:'var(--ink)', color:'var(--paper)', borderRadius:20, padding:'22px 22px 18px', position:'relative', overflow:'hidden'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14}}>
          <div>
            <div className="fk-eyebrow" style={{color:'var(--ink-5)'}}>Tu pulso · hoy</div>
            <div style={{display:'flex', alignItems:'baseline', gap:8, marginTop:4}}>
              <span className="fk-serif" style={{fontSize:64, fontWeight:300, letterSpacing:'-0.04em', lineHeight:0.9}}>74</span>
              <span className="fk-mono" style={{fontSize:11, color:'var(--ink-5)', textTransform:'uppercase', letterSpacing:'0.1em'}}>/ 100</span>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <Chip tone="signal" style={{background:'rgba(255,90,31,0.15)', color:'var(--signal-2)'}}>
              <Ic.flame width="10" height="10"/> Racha 6
            </Chip>
          </div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:8, marginTop:6, marginBottom:6}}>
          <PulseLine w={280} h={36} color="var(--signal)" strokeWidth={1.8} active/>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.1)'}}>
          {[
            {l:'Comida', v:'4/5', c:'var(--leaf)'},
            {l:'Mov.',   v:'52m', c:'var(--signal)'},
            {l:'Sueño',  v:'7:20', c:'var(--sky)'},
            {l:'Ánimo',  v:'8', c:'var(--honey)'},
          ].map(m => (
            <div key={m.l}>
              <div style={{width:6, height:6, background:m.c, borderRadius:999, marginBottom:6}}/>
              <div className="fk-mono" style={{fontSize:10, color:'var(--ink-5)', textTransform:'uppercase', letterSpacing:'0.08em'}}>{m.l}</div>
              <div className="fk-serif" style={{fontSize:18, fontWeight:400, marginTop:2}}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Next up — asymmetric list */}
      <div style={{padding:'24px 20px 10px'}}>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:12}}>
          <div className="fk-eyebrow">Lo que sigue</div>
          <span className="fk-mono" style={{fontSize:10, color:'var(--ink-4)'}}>3 pendientes</span>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          <div style={{display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#fff', border:'1px solid var(--ink-7)', borderRadius:12}}>
            <div style={{width:34, height:34, borderRadius:10, background:'var(--signal-soft)', color:'var(--signal)', display:'flex', alignItems:'center', justifyContent:'center'}}><Ic.dumb width="16" height="16"/></div>
            <div style={{flex:1}}>
              <div style={{fontSize:14, fontWeight:500}}>Pierna · Sentadilla</div>
              <div className="fk-mono" style={{fontSize:10, color:'var(--ink-4)', marginTop:2, letterSpacing:'0.04em'}}>5×5 · 45 MIN · HOY 6PM</div>
            </div>
            <Ic.chevR color="var(--ink-4)"/>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#fff', border:'1px solid var(--ink-7)', borderRadius:12}}>
            <div style={{width:34, height:34, borderRadius:10, background:'var(--leaf-soft)', color:'var(--leaf)', display:'flex', alignItems:'center', justifyContent:'center'}}><Ic.apple width="16" height="16"/></div>
            <div style={{flex:1}}>
              <div style={{fontSize:14, fontWeight:500}}>Te faltan <span className="fk-serif" style={{fontStyle:'italic'}}>2 verduras</span></div>
              <div className="fk-mono" style={{fontSize:10, color:'var(--ink-4)', marginTop:2, letterSpacing:'0.04em'}}>SUGERENCIA SMAE · CENA</div>
            </div>
            <Ic.chevR color="var(--ink-4)"/>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#fff', border:'1px solid var(--ink-7)', borderRadius:12}}>
            <div style={{width:34, height:34, borderRadius:10, background:'var(--sky-soft)', color:'var(--sky)', display:'flex', alignItems:'center', justifyContent:'center'}}><Ic.book width="16" height="16"/></div>
            <div style={{flex:1}}>
              <div style={{fontSize:14, fontWeight:500}}>Journal de hoy</div>
              <div className="fk-mono" style={{fontSize:10, color:'var(--ink-4)', marginTop:2, letterSpacing:'0.04em'}}>3 LÍNEAS · ANTES DE DORMIR</div>
            </div>
            <Ic.chevR color="var(--ink-4)"/>
          </div>
        </div>
      </div>
    </div>
    <Dock active="home"/>
  </PhoneFrame>
);

/* ── 3. Quick-add sheet — open action ── */
const ScreenAdd = () => (
  <PhoneFrame>
    {/* dim background */}
    <div style={{position:'absolute', inset:0, background:'rgba(10,10,10,0.4)'}}/>
    <div style={{position:'absolute', bottom:0, left:0, right:0, background:'var(--paper)', borderRadius:'24px 24px 0 0', padding:'12px 20px 28px'}}>
      <div style={{width:36, height:4, background:'var(--ink-6)', borderRadius:4, margin:'0 auto 18px'}}/>
      <div className="fk-eyebrow" style={{marginBottom:10}}>Registrar</div>
      <h2 className="fk-serif" style={{fontSize:32, fontWeight:300, letterSpacing:'-0.03em', margin:'0 0 4px', lineHeight:1}}>
        ¿Qué <span style={{fontStyle:'italic'}}>pasó</span>?
      </h2>
      <p style={{fontSize:13, color:'var(--ink-4)', margin:'0 0 20px'}}>Describe en voz, foto o escrito. Yo organizo.</p>

      {/* Voice tap */}
      <div style={{background:'var(--ink)', color:'var(--paper)', borderRadius:18, padding:'20px 18px', display:'flex', alignItems:'center', gap:14, marginBottom:12}}>
        <div style={{width:48, height:48, borderRadius:999, background:'var(--signal)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff'}}>
          <Ic.mic width="20" height="20"/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:14, fontWeight:500}}>Mantén para hablar</div>
          <PulseLine w={160} h={18} color="var(--signal)" strokeWidth={1.5}/>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16}}>
        <div style={{background:'#fff', border:'1px solid var(--ink-7)', borderRadius:14, padding:'14px 14px 12px'}}>
          <div style={{width:30, height:30, borderRadius:8, background:'var(--paper-3)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10}}><Ic.cam width="15" height="15"/></div>
          <div style={{fontSize:13, fontWeight:500}}>Foto de plato</div>
          <div className="fk-mono" style={{fontSize:9, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2}}>SMAE auto</div>
        </div>
        <div style={{background:'#fff', border:'1px solid var(--ink-7)', borderRadius:14, padding:'14px 14px 12px'}}>
          <div style={{width:30, height:30, borderRadius:8, background:'var(--paper-3)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10}}><Ic.dumb width="15" height="15"/></div>
          <div style={{fontSize:13, fontWeight:500}}>Serie gym</div>
          <div className="fk-mono" style={{fontSize:9, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2}}>rápido</div>
        </div>
        <div style={{background:'#fff', border:'1px solid var(--ink-7)', borderRadius:14, padding:'14px 14px 12px'}}>
          <div style={{width:30, height:30, borderRadius:8, background:'var(--paper-3)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10}}><Ic.drop width="15" height="15"/></div>
          <div style={{fontSize:13, fontWeight:500}}>Peso / Agua</div>
          <div className="fk-mono" style={{fontSize:9, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2}}>1 tap</div>
        </div>
        <div style={{background:'#fff', border:'1px solid var(--ink-7)', borderRadius:14, padding:'14px 14px 12px'}}>
          <div style={{width:30, height:30, borderRadius:8, background:'var(--paper-3)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10}}><Ic.book width="15" height="15"/></div>
          <div style={{fontSize:13, fontWeight:500}}>Journal</div>
          <div className="fk-mono" style={{fontSize:9, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2}}>3 prompts</div>
        </div>
      </div>

      <div className="fk-eyebrow" style={{marginBottom:8}}>Recientes</div>
      <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
        <Chip tone="leaf">🥗 Ensalada atún</Chip>
        <Chip tone="berry">Sentadilla 80kg</Chip>
        <Chip tone="sky">7h sueño</Chip>
      </div>
    </div>
  </PhoneFrame>
);

/* ── 4. Plato del día (SMAE) ── */
const ScreenFood = () => (
  <PhoneFrame bg="var(--paper)">
    {/* header */}
    <div style={{position:'absolute', top:44, left:0, right:0, padding:'14px 20px 0', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
      <button style={{width:34, height:34, borderRadius:999, background:'#fff', border:'1px solid var(--ink-7)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink)'}}><Ic.chevL/></button>
      <div style={{textAlign:'center'}}>
        <div className="fk-eyebrow">Plato del día</div>
        <div style={{fontSize:14, fontWeight:500}}>Mar · 15 abr</div>
      </div>
      <button style={{width:34, height:34, borderRadius:999, background:'#fff', border:'1px solid var(--ink-7)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink)'}}><Ic.plus/></button>
    </div>

    <div className="fk-scroll" style={{position:'absolute', inset:'104px 0 96px', overflowY:'auto', padding:'4px 20px 20px'}}>
      {/* Plato del Bien Comer — hero */}
      <div style={{background:'var(--cream)', borderRadius:20, padding:'22px 20px', marginBottom:16, position:'relative', overflow:'hidden'}}>
        <div className="fk-eyebrow" style={{marginBottom:6}}>SMAE · Plato del Bien Comer</div>
        <h2 className="fk-serif" style={{fontSize:26, fontWeight:300, letterSpacing:'-0.02em', margin:'0 0 14px', lineHeight:1.1}}>
          Vas por <span style={{fontStyle:'italic', color:'var(--signal)'}}>buen camino</span>, te faltan dos verduras.
        </h2>

        {/* Round plate — divided into 3 SMAE groups */}
        <div style={{position:'relative', width:190, height:190, margin:'10px auto 0'}}>
          <svg width="190" height="190" viewBox="0 0 190 190" style={{position:'absolute', inset:0}}>
            <circle cx="95" cy="95" r="88" fill="#fff" stroke="var(--ink-7)"/>
            {/* three wedges - subtle */}
            <path d="M95 95 L95 7 A88 88 0 0 1 177.5 128.5 Z" fill="var(--leaf-soft)"/>
            <path d="M95 95 L177.5 128.5 A88 88 0 0 1 12.5 128.5 Z" fill="var(--honey-soft)"/>
            <path d="M95 95 L12.5 128.5 A88 88 0 0 1 95 7 Z" fill="var(--berry-soft)"/>
            <circle cx="95" cy="95" r="88" fill="none" stroke="var(--ink)" strokeWidth="1.5"/>
            <line x1="95" y1="95" x2="95" y2="7" stroke="var(--ink-6)"/>
            <line x1="95" y1="95" x2="177.5" y2="128.5" stroke="var(--ink-6)"/>
            <line x1="95" y1="95" x2="12.5" y2="128.5" stroke="var(--ink-6)"/>
          </svg>
          {/* group labels */}
          <div style={{position:'absolute', top:22, left:'50%', transform:'translateX(-50%)', textAlign:'center'}}>
            <div className="fk-mono" style={{fontSize:9, color:'var(--leaf)', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600}}>Verduras</div>
            <div className="fk-serif" style={{fontSize:22, color:'var(--leaf)'}}>3<span style={{color:'var(--ink-5)', fontSize:12}}>/5</span></div>
          </div>
          <div style={{position:'absolute', bottom:30, right:10, textAlign:'right'}}>
            <div className="fk-mono" style={{fontSize:9, color:'#8a6411', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600}}>Cereales</div>
            <div className="fk-serif" style={{fontSize:22, color:'#8a6411'}}>4<span style={{color:'var(--ink-5)', fontSize:12}}>/4</span></div>
          </div>
          <div style={{position:'absolute', bottom:30, left:10}}>
            <div className="fk-mono" style={{fontSize:9, color:'var(--berry)', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600}}>Leg / Orig.</div>
            <div className="fk-serif" style={{fontSize:22, color:'var(--berry)'}}>2<span style={{color:'var(--ink-5)', fontSize:12}}>/3</span></div>
          </div>
        </div>
      </div>

      {/* Meals list */}
      <div className="fk-eyebrow" style={{marginBottom:10}}>Lo que comiste</div>
      {[
        {t:'07:20', n:'Desayuno', body:'Omelette · espinaca · fruta', tags:[['leaf','V'],['berry','O'],['honey','C']]},
        {t:'13:45', n:'Comida', body:'Arroz integral, pollo, ensalada', tags:[['honey','C'],['berry','O'],['leaf','V']]},
        {t:'16:30', n:'Snack', body:'Yogurt + nuez', tags:[['berry','O']]},
      ].map((m,i)=>(
        <div key={i} style={{display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid var(--ink-7)'}}>
          <div style={{width:44, textAlign:'right'}}>
            <div className="fk-mono" style={{fontSize:11, color:'var(--ink-3)'}}>{m.t}</div>
          </div>
          <div style={{flex:1}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
              <div style={{fontSize:14, fontWeight:500}}>{m.n}</div>
              <div style={{display:'flex', gap:3}}>{m.tags.map((tg,j)=><Chip key={j} tone={tg[0]} style={{padding:'2px 6px', fontSize:9}}>{tg[1]}</Chip>)}</div>
            </div>
            <div style={{fontSize:12, color:'var(--ink-4)', marginTop:2}}>{m.body}</div>
          </div>
        </div>
      ))}
    </div>
    <Dock active="food"/>
  </PhoneFrame>
);

Object.assign(window, { PhoneFrame, Dock, ScreenLogin, ScreenHome, ScreenAdd, ScreenFood });
