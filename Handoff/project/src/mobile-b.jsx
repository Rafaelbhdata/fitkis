/* Fitkis v5 — Mobile screens B: Gym, Weight, Habits, Journal, Coach, Recovery, Replay */

/* ── 5. Gym — workout session ── */
const ScreenGym = () => (
  <PhoneFrame bg="var(--ink)">
    <div style={{position:'absolute', top:44, left:0, right:0, padding:'14px 20px 0', display:'flex', alignItems:'center', justifyContent:'space-between', color:'var(--paper)'}}>
      <button style={{width:34, height:34, borderRadius:999, background:'rgba(255,255,255,0.08)', border:'none', color:'var(--paper)', display:'flex', alignItems:'center', justifyContent:'center'}}><Ic.chevL/></button>
      <div style={{textAlign:'center'}}>
        <div className="fk-eyebrow" style={{color:'var(--ink-5)'}}>Semana 4 · Pierna A</div>
        <div style={{fontSize:14, fontWeight:500}}>Entrenamiento</div>
      </div>
      <button style={{width:34, height:34, borderRadius:999, background:'rgba(255,255,255,0.08)', border:'none', color:'var(--paper)', display:'flex', alignItems:'center', justifyContent:'center'}}><Ic.settings width="14" height="14"/></button>
    </div>

    <div className="fk-scroll" style={{position:'absolute', inset:'104px 0 96px', overflowY:'auto', padding:'0 20px 20px', color:'var(--paper)'}}>
      {/* Timer pulse */}
      <div style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'18px 20px', marginBottom:14}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
          <div>
            <div className="fk-eyebrow" style={{color:'var(--ink-5)'}}>Descanso</div>
            <div style={{display:'flex', alignItems:'baseline', gap:4}}>
              <span className="fk-serif" style={{fontSize:52, fontWeight:300, letterSpacing:'-0.04em', lineHeight:1}}>01:24</span>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div className="fk-eyebrow" style={{color:'var(--ink-5)'}}>Elapsed</div>
            <div className="fk-mono" style={{fontSize:14, marginTop:2}}>32:18</div>
          </div>
        </div>
        <div style={{marginTop:12}}>
          <PulseLine w={280} h={28} color="var(--signal)" strokeWidth={1.8} active/>
        </div>
      </div>

      {/* Current exercise */}
      <div className="fk-eyebrow" style={{color:'var(--ink-5)', marginBottom:8}}>Ejercicio 2 / 5</div>
      <h2 className="fk-serif" style={{fontSize:32, fontWeight:300, letterSpacing:'-0.02em', margin:'0 0 16px', lineHeight:1}}>
        Sentadilla <span style={{fontStyle:'italic', color:'var(--signal)'}}>trasera</span>
      </h2>

      {/* Sets table */}
      <div style={{background:'rgba(255,255,255,0.04)', borderRadius:14, overflow:'hidden'}}>
        <div style={{display:'grid', gridTemplateColumns:'32px 1fr 1fr 1fr 28px', gap:8, padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
          {['SET','PESO','REPS','RPE',''].map((h,i)=>(
            <div key={i} className="fk-mono" style={{fontSize:9, color:'var(--ink-5)', letterSpacing:'0.1em', textTransform:'uppercase'}}>{h}</div>
          ))}
        </div>
        {[
          {s:1, w:'60', r:'8', rpe:'6', done:true},
          {s:2, w:'80', r:'5', rpe:'8', done:true},
          {s:3, w:'80', r:'5', rpe:'8', done:false, current:true},
          {s:4, w:'80', r:'5', rpe:'—', done:false},
          {s:5, w:'80', r:'5', rpe:'—', done:false},
        ].map(s => (
          <div key={s.s} style={{display:'grid', gridTemplateColumns:'32px 1fr 1fr 1fr 28px', gap:8, padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', alignItems:'center', background: s.current ? 'rgba(255,90,31,0.08)' : 'transparent'}}>
            <div className="fk-mono" style={{fontSize:12, color: s.current ? 'var(--signal)' : 'var(--ink-5)'}}>{s.s}</div>
            <div className="fk-serif" style={{fontSize:18, fontWeight: s.current ? 500 : 300, color: s.done||s.current ? 'var(--paper)' : 'var(--ink-5)'}}>{s.w}<span className="fk-mono" style={{fontSize:10, color:'var(--ink-5)', marginLeft:3}}>kg</span></div>
            <div className="fk-serif" style={{fontSize:18, fontWeight: s.current ? 500 : 300, color: s.done||s.current ? 'var(--paper)' : 'var(--ink-5)'}}>{s.r}</div>
            <div className="fk-mono" style={{fontSize:13, color:'var(--ink-5)'}}>{s.rpe}</div>
            <div style={{width:20, height:20, borderRadius:999, border:'1px solid '+(s.done?'var(--signal)':'var(--ink-5)'), background: s.done ? 'var(--signal)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center'}}>
              {s.done && <Ic.check width="10" height="10" color="#fff"/>}
            </div>
          </div>
        ))}
      </div>

      {/* Compare to last session */}
      <div style={{marginTop:14, padding:'14px 16px', background:'rgba(255,255,255,0.03)', borderRadius:12, display:'flex', alignItems:'center', gap:10}}>
        <div style={{color:'var(--signal)'}}><Ic.spark width="16" height="16"/></div>
        <div style={{flex:1, fontSize:12}}>
          <span style={{color:'var(--paper)'}}>+2.5 kg</span> vs. sesión pasada
        </div>
        <Spark values={[72,73,75,76,78,79,80]} w={56} h={20} color="var(--signal)"/>
      </div>
    </div>

    {/* Floating action */}
    <div style={{position:'absolute', bottom:90, left:20, right:20}}>
      <Btn variant="signal" size="lg" style={{width:'100%', justifyContent:'center', fontSize:15}}>
        Registrar serie · 80 × 5 <Ic.arrow width="14" height="14"/>
      </Btn>
    </div>
  </PhoneFrame>
);

/* ── 6. Peso — trend ── */
const ScreenWeight = () => {
  const vals = [82.4, 82.1, 82.3, 81.9, 81.5, 81.7, 81.2, 81.0, 80.8, 80.9, 80.5, 80.2, 80.0, 79.8];
  return (
    <PhoneFrame>
      <div style={{position:'absolute', top:44, left:0, right:0, padding:'14px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <button style={{width:34, height:34, borderRadius:999, background:'#fff', border:'1px solid var(--ink-7)', display:'flex', alignItems:'center', justifyContent:'center'}}><Ic.chevL/></button>
        <div className="fk-eyebrow">Peso · 2 semanas</div>
        <div style={{width:34}}/>
      </div>

      <div className="fk-scroll" style={{position:'absolute', inset:'104px 0 96px', overflowY:'auto', padding:'0 20px 20px'}}>
        {/* Hero stat */}
        <div style={{display:'flex', alignItems:'baseline', gap:12, marginBottom:4}}>
          <span className="fk-serif" style={{fontSize:88, fontWeight:200, letterSpacing:'-0.05em', lineHeight:0.9}}>79.8</span>
          <span className="fk-mono" style={{fontSize:14, color:'var(--ink-4)'}}>kg</span>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:24}}>
          <Chip tone="leaf">↓ 2.6 kg</Chip>
          <span style={{fontSize:12, color:'var(--ink-4)'}}>desde el 1 abr</span>
        </div>

        {/* Chart card */}
        <div style={{background:'#fff', border:'1px solid var(--ink-7)', borderRadius:18, padding:'18px 0 14px', marginBottom:16, overflow:'hidden'}}>
          <div style={{padding:'0 18px', display:'flex', justifyContent:'space-between', marginBottom:14}}>
            <div>
              <div className="fk-mono" style={{fontSize:10, color:'var(--ink-4)', letterSpacing:'0.1em', textTransform:'uppercase'}}>Promedio 7 días</div>
              <div className="fk-serif" style={{fontSize:22, fontWeight:400, marginTop:2}}>80.3 <span style={{fontSize:12, color:'var(--ink-4)'}}>kg</span></div>
            </div>
            <div style={{display:'flex', gap:4}}>
              {['7D','1M','6M','1A'].map((t,i)=>(
                <button key={t} style={{border:'none', padding:'5px 9px', borderRadius:6, fontSize:10, fontFamily:'var(--f-mono)', letterSpacing:'0.08em', background: i===0?'var(--ink)':'transparent', color: i===0?'var(--paper)':'var(--ink-4)'}}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{padding:'8px 0 0 4px'}}>
            <Spark values={vals} w={300} h={120} color="var(--signal)" fill/>
          </div>
          <div style={{display:'flex', justifyContent:'space-between', padding:'6px 18px 0', marginTop:4}}>
            {['1','5','10','15'].map(d=><span key={d} className="fk-mono" style={{fontSize:9, color:'var(--ink-5)'}}>{d} abr</span>)}
          </div>
        </div>

        {/* Quick log row */}
        <div style={{background:'var(--ink)', color:'var(--paper)', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12}}>
          <div style={{width:36, height:36, background:'var(--signal)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center'}}><Ic.drop width="16" height="16" color="#fff"/></div>
          <div style={{flex:1}}>
            <div style={{fontSize:13, fontWeight:500}}>Registra hoy</div>
            <div style={{fontSize:11, color:'var(--ink-5)', marginTop:2}}>En ayunas, después del baño</div>
          </div>
          <Ic.chevR color="var(--paper)"/>
        </div>

        {/* Insight */}
        <div style={{marginTop:14, padding:'16px 18px', background:'var(--leaf-soft)', borderRadius:14}}>
          <div className="fk-eyebrow" style={{color:'var(--leaf)', marginBottom:6}}>✧ Patrón</div>
          <div className="fk-serif" style={{fontSize:16, fontWeight:400, lineHeight:1.35, letterSpacing:'-0.01em'}}>
            Bajas consistentemente los <span style={{fontStyle:'italic'}}>lunes</span>. Tu domingo hidrata bien.
          </div>
        </div>
      </div>
      <Dock active="you"/>
    </PhoneFrame>
  );
};

/* ── 7. Hábitos — ritual ── */
const ScreenHabits = () => (
  <PhoneFrame>
    <div style={{position:'absolute', top:44, left:0, right:0, padding:'14px 20px 0'}}>
      <div className="fk-eyebrow" style={{marginBottom:4}}>Ritual diario</div>
      <h2 className="fk-serif" style={{fontSize:28, fontWeight:300, letterSpacing:'-0.02em', margin:0, lineHeight:1}}>
        Pequeñas <span style={{fontStyle:'italic'}}>constantes</span>.
      </h2>
    </div>

    <div className="fk-scroll" style={{position:'absolute', inset:'130px 0 96px', overflowY:'auto', padding:'10px 20px 20px'}}>
      {/* Streak header */}
      <div style={{display:'flex', gap:10, marginBottom:16}}>
        <div style={{flex:1, background:'var(--ink)', color:'var(--paper)', borderRadius:14, padding:'14px 14px 12px'}}>
          <div className="fk-eyebrow" style={{color:'var(--ink-5)', marginBottom:6}}>Racha</div>
          <div style={{display:'flex', alignItems:'baseline', gap:3}}>
            <span className="fk-serif" style={{fontSize:36, fontWeight:300, letterSpacing:'-0.03em'}}>6</span>
            <span className="fk-mono" style={{fontSize:10, color:'var(--ink-5)'}}>días</span>
          </div>
          <div style={{marginTop:8, display:'flex', gap:3}}>
            {[1,1,1,1,1,1,0,0].map((d,i)=><div key={i} style={{flex:1, height:6, background: d ? 'var(--signal)' : 'rgba(255,255,255,0.15)', borderRadius:2}}/>)}
          </div>
        </div>
        <div style={{flex:1, background:'var(--cream)', borderRadius:14, padding:'14px 14px 12px'}}>
          <div className="fk-eyebrow" style={{marginBottom:6}}>Esta semana</div>
          <div style={{display:'flex', alignItems:'baseline', gap:3}}>
            <span className="fk-serif" style={{fontSize:36, fontWeight:300, letterSpacing:'-0.03em'}}>84<span style={{fontSize:20}}>%</span></span>
          </div>
          <div className="fk-mono" style={{fontSize:10, color:'var(--ink-4)', marginTop:8}}>34 / 40 hábitos</div>
        </div>
      </div>

      {/* Habit list */}
      <div className="fk-eyebrow" style={{marginBottom:10}}>Hoy · 4 de 5</div>
      <div style={{display:'flex', flexDirection:'column', gap:8}}>
        {[
          {n:'Agua 2L', done:true, week:[1,1,1,1,1,1,0]},
          {n:'Caminar 8k pasos', done:true, week:[1,1,0,1,1,1,0]},
          {n:'Dormir 7h', done:true, week:[1,1,1,1,1,1,0]},
          {n:'Leer 15 min', done:true, week:[1,0,1,1,1,1,0]},
          {n:'Meditar 5 min', done:false, week:[0,1,0,1,0,1,0]},
        ].map((h,i)=>(
          <div key={i} style={{display:'flex', alignItems:'center', gap:12, padding:'14px 14px', background:'#fff', border:'1px solid var(--ink-7)', borderRadius:12}}>
            <div style={{width:24, height:24, borderRadius:999, border:'1.5px solid '+(h.done?'var(--ink)':'var(--ink-6)'), background: h.done?'var(--ink)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
              {h.done && <Ic.check width="12" height="12" color="var(--paper)"/>}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13, fontWeight:500, color: h.done?'var(--ink)':'var(--ink-3)'}}>{h.n}</div>
              <div style={{display:'flex', gap:3, marginTop:6}}>
                {h.week.map((d,j)=>(
                  <div key={j} style={{width:14, height:14, borderRadius:3, background: d ? 'var(--signal)' : 'var(--paper-3)'}}/>
                ))}
              </div>
            </div>
            <div className="fk-mono" style={{fontSize:10, color:'var(--ink-4)', letterSpacing:'0.05em'}}>
              {h.week.filter(Boolean).length}/7
            </div>
          </div>
        ))}
      </div>
    </div>
    <Dock active="you"/>
  </PhoneFrame>
);

/* ── 8. Journal ── */
const ScreenJournal = () => (
  <PhoneFrame bg="var(--cream)">
    <div style={{position:'absolute', top:44, left:0, right:0, padding:'14px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
      <button style={{width:34, height:34, borderRadius:999, background:'#fff', border:'1px solid var(--ink-7)', display:'flex', alignItems:'center', justifyContent:'center'}}><Ic.chevL/></button>
      <div style={{textAlign:'center'}}>
        <div className="fk-eyebrow">Noche · Mar 15</div>
        <div style={{fontSize:13, fontWeight:500}}>Journal</div>
      </div>
      <div style={{width:34}}/>
    </div>

    <div className="fk-scroll" style={{position:'absolute', inset:'104px 0 96px', overflowY:'auto', padding:'10px 24px 20px'}}>
      <div className="fk-eyebrow" style={{marginBottom:12}}>3 líneas, 3 preguntas</div>

      {[
        {q:'¿Qué salió mejor de lo esperado?', a:'La serie pesada de sentadilla. Sentí firmeza en el core y no fallé ninguna rep.', style:'default'},
        {q:'¿Dónde te costó?', a:'Media tarde bajé mucho la energía. Pensé en dormir la siesta.', style:'default'},
        {q:'¿Una cosa por mañana?', a:'', style:'empty'},
      ].map((item,i)=>(
        <div key={i} style={{marginBottom:22}}>
          <div style={{display:'flex', gap:10, marginBottom:6}}>
            <div style={{width:18, height:18, borderRadius:999, background:'var(--ink)', color:'var(--paper)', fontSize:10, fontFamily:'var(--f-mono)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600}}>{i+1}</div>
            <div style={{fontSize:13, fontWeight:500, color:'var(--ink-2)'}}>{item.q}</div>
          </div>
          <div style={{marginLeft:28, paddingLeft:14, borderLeft:'2px solid '+(item.style==='empty'?'var(--ink-7)':'var(--signal)')}}>
            {item.style==='empty' ? (
              <div style={{fontFamily:'var(--f-serif)', fontStyle:'italic', fontSize:17, color:'var(--ink-5)', fontWeight:300, lineHeight:1.5}}>Escribe algo pequeño…</div>
            ) : (
              <div className="fk-serif" style={{fontSize:18, lineHeight:1.45, color:'var(--ink-2)', fontWeight:400, letterSpacing:'-0.005em'}}>
                {item.a}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Mood */}
      <div style={{marginTop:26, paddingTop:22, borderTop:'1px solid var(--ink-7)'}}>
        <div className="fk-eyebrow" style={{marginBottom:12}}>Ánimo</div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <div key={n} style={{width:20, height:n===8?32:14, borderRadius:2, background: n<=8?'var(--signal)':'var(--ink-7)'}}/>
          ))}
        </div>
        <div style={{display:'flex', justifyContent:'space-between', marginTop:6}}>
          <span className="fk-mono" style={{fontSize:9, color:'var(--ink-4)'}}>bajo</span>
          <span className="fk-serif" style={{fontSize:13, fontStyle:'italic'}}>8 · bien</span>
          <span className="fk-mono" style={{fontSize:9, color:'var(--ink-4)'}}>alto</span>
        </div>
      </div>
    </div>
    <Dock active="you"/>
  </PhoneFrame>
);

/* ── 9. Coach IA ── */
const ScreenCoach = () => (
  <PhoneFrame bg="var(--paper)">
    <div style={{position:'absolute', top:44, left:0, right:0, padding:'14px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <FkMark size={32}/>
        <div>
          <div style={{fontSize:14, fontWeight:500}}>Coach</div>
          <div className="fk-mono" style={{fontSize:9, color:'var(--leaf)', textTransform:'uppercase', letterSpacing:'0.1em', display:'flex', alignItems:'center', gap:4}}>
            <span style={{width:6, height:6, background:'var(--leaf)', borderRadius:999}} className="fk-pulse-dot"/>
            escuchando
          </div>
        </div>
      </div>
      <button style={{width:34, height:34, borderRadius:999, background:'#fff', border:'1px solid var(--ink-7)', display:'flex', alignItems:'center', justifyContent:'center'}}><Ic.settings width="14" height="14"/></button>
    </div>

    <div className="fk-scroll" style={{position:'absolute', inset:'104px 0 96px', overflowY:'auto', padding:'10px 20px 20px'}}>
      {/* bot bubble */}
      <div style={{maxWidth:260, marginBottom:14}}>
        <div style={{background:'#fff', border:'1px solid var(--ink-7)', borderRadius:'14px 14px 14px 4px', padding:'14px 16px'}}>
          <div className="fk-serif" style={{fontSize:17, lineHeight:1.4, color:'var(--ink-2)', fontWeight:400, letterSpacing:'-0.005em'}}>
            Vi tu sentadilla: <span style={{fontStyle:'italic'}}>bajaste RPE a 7</span> en la última serie. ¿Cómo te sentiste?
          </div>
        </div>
        <div className="fk-mono" style={{fontSize:9, color:'var(--ink-4)', marginTop:4, marginLeft:6}}>hace 2 min</div>
      </div>

      {/* user bubble */}
      <div style={{maxWidth:240, marginLeft:'auto', marginBottom:14}}>
        <div style={{background:'var(--ink)', color:'var(--paper)', borderRadius:'14px 14px 4px 14px', padding:'12px 14px'}}>
          <div style={{fontSize:14, lineHeight:1.4}}>Bien, sentí la forma limpia. Podría haber hecho una más.</div>
        </div>
      </div>

      {/* bot with card inside */}
      <div style={{maxWidth:280, marginBottom:14}}>
        <div style={{background:'#fff', border:'1px solid var(--ink-7)', borderRadius:'14px 14px 14px 4px', padding:'14px 16px'}}>
          <div className="fk-serif" style={{fontSize:16, lineHeight:1.4, color:'var(--ink-2)', marginBottom:10}}>
            Perfecto. Para la próxima semana te propongo subir a <span style={{fontStyle:'italic', color:'var(--signal)'}}>82.5 kg</span>.
          </div>
          <div style={{background:'var(--paper-2)', borderRadius:10, padding:'12px 12px', display:'flex', gap:10, alignItems:'center'}}>
            <Ic.dumb width="18" height="18" color="var(--ink-3)"/>
            <div style={{flex:1}}>
              <div style={{fontSize:12, fontWeight:500}}>Progresión sugerida</div>
              <div className="fk-mono" style={{fontSize:10, color:'var(--ink-4)', marginTop:2, letterSpacing:'0.04em'}}>80 → 82.5 KG · +3.1%</div>
            </div>
            <Btn size="sm" variant="primary">Aceptar</Btn>
          </div>
        </div>
      </div>

      {/* Suggested replies */}
      <div style={{display:'flex', gap:6, flexWrap:'wrap', marginTop:6}}>
        <Chip tone="ink">¿Por qué bajé RPE?</Chip>
        <Chip tone="ink">Cambia mi plan</Chip>
        <Chip tone="ink">Dame más contexto</Chip>
      </div>
    </div>

    {/* composer */}
    <div style={{position:'absolute', bottom:90, left:16, right:16, display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid var(--ink-7)', borderRadius:999, padding:'6px 6px 6px 18px'}}>
      <div style={{flex:1, fontSize:13, color:'var(--ink-4)'}}>Escribe o habla…</div>
      <button style={{width:36, height:36, borderRadius:999, background:'var(--signal)', border:'none', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}><Ic.mic/></button>
    </div>
  </PhoneFrame>
);

/* ── 10. Recovery — NEW feature ── */
const ScreenRecovery = () => (
  <PhoneFrame bg="var(--paper)">
    <div style={{position:'absolute', top:44, left:0, right:0, padding:'14px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
      <button style={{width:34, height:34, borderRadius:999, background:'#fff', border:'1px solid var(--ink-7)', display:'flex', alignItems:'center', justifyContent:'center'}}><Ic.chevL/></button>
      <div className="fk-eyebrow">Recuperación</div>
      <div style={{width:34}}/>
    </div>

    <div className="fk-scroll" style={{position:'absolute', inset:'104px 0 96px', overflowY:'auto', padding:'0 20px 20px'}}>
      {/* Hero ring */}
      <div style={{background:'var(--sky-soft)', borderRadius:22, padding:'22px 20px', marginBottom:14, position:'relative', overflow:'hidden'}}>
        <div className="fk-eyebrow" style={{color:'var(--sky)', marginBottom:10}}>Hoy</div>
        <div style={{display:'flex', alignItems:'center', gap:18}}>
          {/* ring */}
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(58,107,140,0.18)" strokeWidth="7"/>
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--sky)" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={2*Math.PI*42} strokeDashoffset={2*Math.PI*42*(1-0.82)} transform="rotate(-90 50 50)"/>
            <text x="50" y="54" textAnchor="middle" style={{fontFamily:'var(--f-serif)', fontSize:30, fontWeight:300, fill:'var(--ink)', letterSpacing:'-0.03em'}}>82</text>
          </svg>
          <div style={{flex:1}}>
            <div className="fk-serif" style={{fontSize:22, fontWeight:400, letterSpacing:'-0.015em', lineHeight:1.2, color:'var(--ink-2)'}}>
              Listo para <span style={{fontStyle:'italic', color:'var(--sky)'}}>empujar</span>.
            </div>
            <div style={{fontSize:12, color:'var(--ink-3)', marginTop:4}}>Sueño 7:20 · HRV estable · ánimo 8</div>
          </div>
        </div>
      </div>

      {/* Factors breakdown */}
      <div className="fk-eyebrow" style={{marginBottom:10}}>Qué suma y qué resta</div>
      {[
        {icon:Ic.moon, n:'Sueño', v:'+28', desc:'7h 20m, calidad alta', tone:'leaf'},
        {icon:Ic.drop, n:'Hidratación', v:'+14', desc:'2.1 L ayer', tone:'leaf'},
        {icon:Ic.spark, n:'Ánimo', v:'+22', desc:'8 / 10 · subiendo', tone:'leaf'},
        {icon:Ic.flame, n:'Carga entrenamiento', v:'−18', desc:'Semana +12% volumen', tone:'berry'},
        {icon:Ic.apple, n:'Proteína', v:'+8', desc:'92 g · cerca de meta', tone:'leaf'},
      ].map((f,i)=>(
        <div key={i} style={{display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--ink-7)'}}>
          <div style={{width:32, height:32, borderRadius:999, background:'var(--paper-2)', display:'flex', alignItems:'center', justifyContent:'center'}}><f.icon width="15" height="15"/></div>
          <div style={{flex:1}}>
            <div style={{fontSize:13, fontWeight:500}}>{f.n}</div>
            <div style={{fontSize:11, color:'var(--ink-4)', marginTop:2}}>{f.desc}</div>
          </div>
          <div className="fk-serif" style={{fontSize:18, fontWeight:400, color: f.tone==='leaf'?'var(--leaf)':'var(--berry)'}}>
            {f.v}
          </div>
        </div>
      ))}

      <div style={{marginTop:16, padding:'16px 18px', background:'var(--ink)', color:'var(--paper)', borderRadius:14}}>
        <div className="fk-eyebrow" style={{color:'var(--ink-5)', marginBottom:6}}>Sugerencia de hoy</div>
        <div className="fk-serif" style={{fontSize:16, fontWeight:400, lineHeight:1.4}}>
          Ve a fondo en la <span style={{fontStyle:'italic', color:'var(--signal)'}}>sentadilla</span>. Tu sistema lo soporta.
        </div>
      </div>
    </div>
    <Dock active="home"/>
  </PhoneFrame>
);

/* ── 11. Replay semanal — shareable story ── */
const ScreenReplay = () => (
  <PhoneFrame bg="var(--ink)">
    {/* top EKG strip */}
    <div style={{position:'absolute', top:60, left:0, right:0}}>
      <PulseLine w={340} h={24} color="var(--signal)" strokeWidth={1.2}/>
    </div>

    <div style={{position:'absolute', top:100, left:24, right:24, color:'var(--paper)'}}>
      <div className="fk-eyebrow" style={{color:'var(--ink-5)', marginBottom:8}}>Semana 15 · Replay</div>
      <h1 className="fk-serif" style={{fontSize:44, fontWeight:300, letterSpacing:'-0.035em', margin:0, lineHeight:0.95}}>
        Una semana<br/>de <span style={{fontStyle:'italic', color:'var(--signal)'}}>ti</span>.
      </h1>
    </div>

    <div style={{position:'absolute', top:240, left:24, right:24, color:'var(--paper)'}}>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
        <div style={{background:'rgba(255,255,255,0.05)', borderRadius:14, padding:'16px 14px'}}>
          <div className="fk-eyebrow" style={{color:'var(--ink-5)', marginBottom:6}}>Pasos</div>
          <div className="fk-serif" style={{fontSize:36, fontWeight:300, letterSpacing:'-0.03em', lineHeight:0.9}}>52<span style={{fontSize:18}}>k</span></div>
          <div className="fk-mono" style={{fontSize:10, color:'var(--leaf)', marginTop:4}}>+12% vs prom.</div>
        </div>
        <div style={{background:'rgba(255,255,255,0.05)', borderRadius:14, padding:'16px 14px'}}>
          <div className="fk-eyebrow" style={{color:'var(--ink-5)', marginBottom:6}}>Kg movidos</div>
          <div className="fk-serif" style={{fontSize:36, fontWeight:300, letterSpacing:'-0.03em', lineHeight:0.9}}>14<span style={{fontSize:18}}>.2 t</span></div>
          <div className="fk-mono" style={{fontSize:10, color:'var(--leaf)', marginTop:4}}>record personal</div>
        </div>
        <div style={{background:'rgba(255,255,255,0.05)', borderRadius:14, padding:'16px 14px'}}>
          <div className="fk-eyebrow" style={{color:'var(--ink-5)', marginBottom:6}}>Sueño prom.</div>
          <div className="fk-serif" style={{fontSize:36, fontWeight:300, letterSpacing:'-0.03em', lineHeight:0.9}}>7<span style={{fontSize:18}}>:14</span></div>
          <Spark values={[6.5,7,7.2,6.8,7.5,7.4,7.3]} w={70} h={14} color="var(--sky)"/>
        </div>
        <div style={{background:'rgba(255,255,255,0.05)', borderRadius:14, padding:'16px 14px'}}>
          <div className="fk-eyebrow" style={{color:'var(--ink-5)', marginBottom:6}}>Plato lleno</div>
          <div className="fk-serif" style={{fontSize:36, fontWeight:300, letterSpacing:'-0.03em', lineHeight:0.9}}>5 / 7</div>
          <div className="fk-mono" style={{fontSize:10, color:'var(--ink-5)', marginTop:4}}>días SMAE ✓</div>
        </div>
      </div>

      {/* Moment */}
      <div style={{marginTop:16, padding:'16px 16px', background:'var(--signal)', color:'#fff', borderRadius:14}}>
        <div className="fk-mono" style={{fontSize:9, color:'rgba(255,255,255,0.8)', textTransform:'uppercase', letterSpacing:'0.12em', fontWeight:500, marginBottom:6}}>✧ Momento de la semana</div>
        <div className="fk-serif" style={{fontSize:18, fontWeight:400, lineHeight:1.3, fontStyle:'italic'}}>
          "Jueves: sentadilla a 80kg. Sin fallar una rep."
        </div>
      </div>
    </div>

    {/* share bar */}
    <div style={{position:'absolute', bottom:30, left:20, right:20, display:'flex', gap:8}}>
      <Btn variant="secondary" size="lg" style={{flex:1, justifyContent:'center', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'var(--paper)'}}>
        <Ic.share width="14" height="14"/> Compartir
      </Btn>
      <Btn variant="signal" size="lg" style={{flex:1, justifyContent:'center'}}>
        Siguiente semana <Ic.arrow width="14" height="14"/>
      </Btn>
    </div>
  </PhoneFrame>
);

Object.assign(window, { ScreenGym, ScreenWeight, ScreenHabits, ScreenJournal, ScreenCoach, ScreenRecovery, ScreenReplay });
