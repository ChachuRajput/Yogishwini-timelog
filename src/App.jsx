import { useState, useEffect, useRef, Fragment } from "react";

const CATS = ["Study","Work","Creative","Exercise","Other"];
const MOODS = [
  {e:"🔥",l:"Focused"},{e:"😐",l:"Meh"},{e:"😴",l:"Drained"},{e:"🦋",l:"Scattered"}
];
const SLOTS = ["Morning","Afternoon","Evening","Night"];
const CAT_COLORS = {Study:"#6366f1",Work:"#0ea5e9",Creative:"#f59e0b",Exercise:"#22c55e",Other:"#a78bfa"};

const fmt = s => {
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;
  return h>0?`${h}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;
};
const fmtTime = ts => new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
const fmtHrs = s => (s/3600).toFixed(1)+"h";
const sameDay = (a,b) => new Date(a).toDateString()===new Date(b).toDateString();
const getSlot = ts => {
  const h=new Date(ts).getHours();
  if(h<6||h>=21)return"Night";
  if(h<12)return"Morning";
  if(h<17)return"Afternoon";
  return"Evening";
};
const weekDays = () => {
  const days=[];const t=new Date();
  for(let i=6;i>=0;i--){const d=new Date(t);d.setDate(t.getDate()-i);days.push(d);}
  return days;
};
const uid = () => Date.now()+Math.random().toString(36).slice(2);

export default function App() {
  const [tab,setTab]=useState("Timer");
  const [sessions,setSessions]=useState([]);
  const [loaded,setLoaded]=useState(false);
  const [running,setRunning]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [task,setTask]=useState("");
  const [cat,setCat]=useState("Study");
  const [distractions,setDistractions]=useState(0);
  const [startTs,setStartTs]=useState(null);
  const [moodModal,setMoodModal]=useState(null);
  const [retroModal,setRetroModal]=useState(false);
  const [retro,setRetro]=useState({task:"",cat:"Study",mins:30,hoursAgo:1,mood:"🔥"});
  const [deleteId,setDeleteId]=useState(null);
  const ivRef=useRef(null);

  useEffect(()=>{
    try{
      const stored=localStorage.getItem('tl:v2');
      if(stored)setSessions(JSON.parse(stored));
    }catch{}
    setLoaded(true);
  },[]);

  const save = ns => {
    setSessions(ns);
    try{localStorage.setItem('tl:v2',JSON.stringify(ns));}catch{}
  };

  useEffect(()=>{
    if(running){ivRef.current=setInterval(()=>setElapsed(p=>p+1),1000);}
    else clearInterval(ivRef.current);
    return()=>clearInterval(ivRef.current);
  },[running]);

  const doStart = () => {
    if(!task.trim())return;
    setRunning(true);setElapsed(0);setDistractions(0);setStartTs(Date.now());
  };

  const doStop = () => {
    setRunning(false);
    setMoodModal({id:uid(),task:task.trim()||"Untitled",cat,startTs,endTs:Date.now(),dur:elapsed,dist:distractions,retro:false});
  };

  const doMood = emoji => {
    const s={...moodModal,mood:emoji};
    save([s,...sessions]);
    setMoodModal(null);setTask("");setElapsed(0);setDistractions(0);
  };

  const doRetro = () => {
    if(!retro.task.trim())return;
    const end=Date.now()-retro.hoursAgo*3600*1000;
    const s={id:uid(),task:retro.task,cat:retro.cat,startTs:end-retro.mins*60*1000,endTs:end,dur:retro.mins*60,dist:0,mood:retro.mood,retro:true};
    save([s,...sessions]);
    setRetroModal(false);setRetro({task:"",cat:"Study",mins:30,hoursAgo:1,mood:"🔥"});
  };

  const doDelete = id => {
    save(sessions.filter(s=>s.id!==id));setDeleteId(null);
  };

  const today=new Date();
  const todaySess=sessions.filter(s=>sameDay(s.startTs||s.endTs,today.getTime()));
  const todaySecs=todaySess.reduce((a,s)=>a+s.dur,0);

  const story = () => {
    const wd=weekDays();
    const ws=sessions.filter(s=>wd.some(d=>sameDay(d.getTime(),s.startTs||s.endTs)));
    if(!ws.length)return"No sessions this week yet. Hit Start to log your first one! 🚀";
    const tot=(ws.reduce((a,s)=>a+s.dur,0)/3600).toFixed(1);
    const catMap=ws.reduce((a,s)=>{a[s.cat]=(a[s.cat]||0)+s.dur;return a},{});
    const topCat=Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
    const dayMap=ws.reduce((a,s)=>{const k=new Date(s.startTs||s.endTs).toLocaleDateString('en',{weekday:'long'});a[k]=(a[k]||0)+s.dur;return a},{});
    const topDay=Object.entries(dayMap).sort((a,b)=>b[1]-a[1])[0];
    const slotMap=ws.reduce((a,s)=>{const k=getSlot(s.startTs||s.endTs);a[k]=(a[k]||0)+s.dur;return a},{});
    const topSlot=Object.entries(slotMap).sort((a,b)=>b[1]-a[1])[0];
    const moodMap=ws.reduce((a,s)=>{if(s.mood)a[s.mood]=(a[s.mood]||0)+1;return a},{});
    const topMood=Object.entries(moodMap).sort((a,b)=>b[1]-a[1])[0];
    const ml=MOODS.find(m=>m.e===topMood?.[0])?.l;
    const avgDist=(ws.reduce((a,s)=>a+(s.dist||0),0)/ws.length).toFixed(1);
    return`You logged ${tot} hours this week across ${ws.length} session${ws.length>1?'s':''}. ${topCat?`${topCat[0]} dominated your time.`:''} ${topDay?`${topDay[0]} was your most active day.`:''} ${topSlot?`You tend to work best in the ${topSlot[0].toLowerCase()}.`:''} ${ml?`Your most common mood was ${ml.toLowerCase()}.`:''} ${parseFloat(avgDist)>0?`You averaged ${avgDist} distraction${parseFloat(avgDist)!==1?'s':''} per session.`:''}`.replace(/\s+/g,' ').trim();
  };

  const wd=weekDays();
  const hmap=wd.map(day=>SLOTS.map(slot=>{
    const ss=sessions.filter(s=>sameDay(s.startTs||s.endTs,day.getTime())&&getSlot(s.startTs||s.endTs)===slot);
    return{mins:ss.reduce((a,s)=>a+s.dur/60,0),count:ss.length};
  }));
  const maxMins=Math.max(...hmap.flat().map(c=>c.mins),1);
  const catTotals=sessions.reduce((a,s)=>{a[s.cat]=(a[s.cat]||0)+s.dur;return a},{});
  const catMax=Math.max(...Object.values(catTotals),1);

  const S={
    page:{minHeight:'100vh',background:'#f8fafc',fontFamily:'system-ui,sans-serif'},
    header:{background:'#fff',borderBottom:'1px solid #e2e8f0',padding:'14px 16px',textAlign:'center'},
    title:{margin:0,fontSize:18,fontWeight:700,color:'#1e293b',letterSpacing:'-0.3px'},
    sub:{margin:'2px 0 0',fontSize:11,color:'#94a3b8'},
    tabs:{display:'flex',background:'#fff',borderBottom:'1px solid #e2e8f0'},
    tab:(a)=>({flex:1,padding:'12px 0',fontSize:13,fontWeight:500,border:'none',background:'none',cursor:'pointer',borderBottom:a?'2px solid #6366f1':'2px solid transparent',color:a?'#6366f1':'#94a3b8',transition:'all .2s'}),
    body:{maxWidth:420,margin:'0 auto',padding:'16px 14px'},
    card:{background:'#fff',borderRadius:16,padding:'20px',marginBottom:12,boxShadow:'0 1px 3px rgba(0,0,0,.06)'},
    input:{width:'100%',boxSizing:'border-box',fontSize:14,padding:'11px 14px',borderRadius:12,border:'1.5px solid #e2e8f0',outline:'none',color:'#334155',background:'#f8fafc',transition:'border .2s'},
    catRow:{display:'flex',gap:6,marginTop:12,flexWrap:'wrap'},
    catBtn:(a,c)=>({padding:'4px 11px',borderRadius:20,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',background:a?CAT_COLORS[c]||'#6366f1':'#f1f5f9',color:a?'#fff':'#64748b',transition:'all .2s'}),
    timer:(r)=>({textAlign:'center',fontSize:64,fontWeight:800,letterSpacing:'-2px',color:r?'#6366f1':'#1e293b',fontVariantNumeric:'tabular-nums',margin:'24px 0 20px',fontFamily:'monospace'}),
    startBtn:(r,d)=>({width:'100%',padding:'14px',borderRadius:14,fontSize:15,fontWeight:700,border:'none',cursor:d?'not-allowed':'pointer',background:r?'#ef4444':'#6366f1',color:'#fff',opacity:d?.4:1,transition:'all .2s'}),
    distCard:{background:'#fffbeb',borderRadius:16,padding:'16px 20px',marginBottom:12,textAlign:'center',boxShadow:'0 1px 3px rgba(0,0,0,.06)'},
    distBtn:{width:64,height:64,borderRadius:32,background:'#fef3c7',border:'2px solid #fde68a',fontSize:28,cursor:'pointer',display:'block',margin:'0 auto'},
    moodOverlay:{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:100},
    moodSheet:{background:'#fff',borderRadius:'24px 24px 0 0',padding:'24px 20px',width:'100%',maxWidth:420},
    moodGrid:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:16},
    moodBtn:{padding:'14px 4px',borderRadius:14,background:'#f8fafc',border:'1.5px solid #e2e8f0',cursor:'pointer',textAlign:'center',fontSize:28,transition:'all .2s'},
    statRow:{display:'flex',gap:10,marginBottom:12},
    statCard:{flex:1,background:'#f1f5f9',borderRadius:12,padding:'12px 14px'},
    sLabel:{fontSize:11,color:'#94a3b8',marginBottom:4},
    sVal:{fontSize:20,fontWeight:700,color:'#1e293b'},
    sessCard:{background:'#fff',borderRadius:14,padding:'14px',marginBottom:8,boxShadow:'0 1px 3px rgba(0,0,0,.05)',display:'flex',alignItems:'center',gap:12,position:'relative'},
    storyBox:{background:'linear-gradient(135deg,#eef2ff,#f0fdf4)',borderRadius:16,padding:'18px 20px',marginBottom:12},
    heatGrid:{display:'grid',gridTemplateColumns:'52px repeat(7,1fr)',gap:3,alignItems:'center'},
    pill:{fontSize:10,padding:'2px 8px',borderRadius:10,fontWeight:600},
  };

  if(!loaded)return<div style={{...S.page,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#94a3b8'}}>Loading...</span></div>;

  return(
    <div style={S.page}>
      <div style={S.header}>
        <p style={S.title}>⏱ Yogishwini</p>
        <p style={S.sub}>Your personal time journal</p>
      </div>
      <div style={S.tabs}>
        {["Timer","Log","Analysis"].map(t=>(
          <button key={t} style={S.tab(tab===t)} onClick={()=>setTab(t)}>{t}</button>
        ))}
      </div>
      <div style={S.body}>

        {tab==="Timer"&&<>
          <div style={S.card}>
            <input style={S.input} placeholder="What are you working on?" value={task} disabled={running} onChange={e=>setTask(e.target.value)}/>
            <div style={S.catRow}>
              {CATS.map(c=><button key={c} style={S.catBtn(cat===c,c)} disabled={running} onClick={()=>setCat(c)}>{c}</button>)}
            </div>
            <div style={S.timer(running)}>{fmt(elapsed)}</div>
            {running&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:16}}>
              <span style={{width:8,height:8,borderRadius:4,background:'#6366f1',animation:'pulse 1.4s infinite',display:'inline-block'}}/>
              <span style={{fontSize:12,color:'#6366f1'}}>Running · {task}</span>
            </div>}
            <button style={S.startBtn(running,!running&&!task.trim())} onClick={running?doStop:doStart} disabled={!running&&!task.trim()}>
              {running?"⏹ Stop & Save":"▶ Start Timer"}
            </button>
          </div>
          {running&&<div style={S.distCard}>
            <p style={{margin:'0 0 10px',fontSize:12,color:'#92400e'}}>Got distracted? Tap to log it</p>
            <button style={S.distBtn} onClick={()=>setDistractions(d=>d+1)}>🦋</button>
            {distractions>0&&<p style={{margin:'10px 0 0',fontSize:13,fontWeight:700,color:'#d97706'}}>{distractions} distraction{distractions!==1?'s':''} logged</p>}
          </div>}
          {!running&&todaySess.length>0&&<div style={{...S.card,padding:'14px 18px'}}>
            <p style={{margin:'0 0 8px',fontSize:11,color:'#94a3b8',fontWeight:600}}>TODAY SO FAR</p>
            <p style={{margin:0,fontSize:22,fontWeight:800,color:'#1e293b'}}>{fmtHrs(todaySecs)}</p>
            <p style={{margin:'2px 0 0',fontSize:12,color:'#94a3b8'}}>{todaySess.length} session{todaySess.length!==1?'s':''}</p>
          </div>}
        </>}

        {tab==="Log"&&<>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:700,color:'#475569'}}>Today's Sessions</span>
            <button style={{fontSize:12,color:'#6366f1',background:'#eef2ff',border:'none',borderRadius:20,padding:'6px 12px',cursor:'pointer',fontWeight:600}} onClick={()=>setRetroModal(true)}>+ Log Past Session</button>
          </div>
          {todaySess.length===0
            ?<div style={{textAlign:'center',padding:'48px 0',color:'#cbd5e1'}}>
              <div style={{fontSize:48,marginBottom:8}}>📭</div>
              <p style={{margin:0,fontSize:13}}>No sessions yet today</p>
              <p style={{margin:'4px 0 0',fontSize:11}}>Hit Start Timer to begin</p>
            </div>
            :todaySess.map(s=>(
              <div key={s.id} style={S.sessCard}>
                <span style={{fontSize:28}}>{s.mood||"⚪"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <p style={{margin:0,fontWeight:700,fontSize:13,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.task}</p>
                    {s.retro&&<span style={{fontSize:10,color:'#94a3b8',flexShrink:0}}>past</span>}
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:3,alignItems:'center'}}>
                    <span style={{...S.pill,background:CAT_COLORS[s.cat]+'22',color:CAT_COLORS[s.cat]}}>{s.cat}</span>
                    <span style={{fontSize:12,color:'#64748b',fontWeight:600}}>{fmt(s.dur)}</span>
                    {s.dist>0&&<span style={{fontSize:11,color:'#f59e0b'}}>🦋 {s.dist}</span>}
                  </div>
                  <p style={{margin:'2px 0 0',fontSize:11,color:'#94a3b8'}}>{fmtTime(s.startTs||s.endTs)}</p>
                </div>
                <button style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#cbd5e1',padding:4}} onClick={()=>setDeleteId(deleteId===s.id?null:s.id)}>✕</button>
                {deleteId===s.id&&<div style={{position:'absolute',right:60,top:'50%',transform:'translateY(-50%)'}}>
                  <button style={{fontSize:11,background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:8,padding:'4px 10px',cursor:'pointer'}} onClick={()=>doDelete(s.id)}>Delete?</button>
                </div>}
              </div>
            ))
          }
        </>}

        {tab==="Analysis"&&<>
          <div style={S.storyBox}>
            <p style={{margin:'0 0 6px',fontSize:11,fontWeight:700,color:'#6366f1',letterSpacing:'.5px'}}>📖 WEEKLY TIME STORY</p>
            <p style={{margin:0,fontSize:13,color:'#1e293b',lineHeight:1.7}}>{story()}</p>
          </div>
          <div style={S.statRow}>
            <div style={S.statCard}><p style={S.sLabel}>Sessions today</p><p style={S.sVal}>{todaySess.length}</p></div>
            <div style={S.statCard}><p style={S.sLabel}>Time today</p><p style={S.sVal}>{fmtHrs(todaySecs)}</p></div>
            <div style={S.statCard}><p style={S.sLabel}>All time</p><p style={S.sVal}>{fmtHrs(sessions.reduce((a,s)=>a+s.dur,0))}</p></div>
          </div>
          <div style={S.card}>
            <p style={{margin:'0 0 14px',fontSize:11,fontWeight:700,color:'#94a3b8',letterSpacing:'.5px'}}>🌡 ENERGY HEATMAP</p>
            <div style={S.heatGrid}>
              <div/>
              {wd.map((d,i)=><div key={i} style={{textAlign:'center',fontSize:10,color:'#94a3b8',marginBottom:2}}>{d.toLocaleDateString('en',{weekday:'narrow'})}</div>)}
              {SLOTS.map((slot,si)=>(
                <Fragment key={slot}>
                  <div style={{fontSize:10,color:'#94a3b8',textAlign:'right',paddingRight:4}}>{slot.slice(0,3)}</div>
                  {wd.map((_,di)=>{
                    const cell=hmap[di][si];
                    const intensity=cell.mins/maxMins;
                    return<div key={di+"-"+si} title={`${Math.round(cell.mins)} min`} style={{height:28,borderRadius:6,background:cell.mins>0?`rgba(99,102,241,${.12+intensity*.88})`:'#f1f5f9',transition:'background .3s'}}/>;
                  })}
                </Fragment>
              ))}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:4,marginTop:12,justifyContent:'flex-end'}}>
              <span style={{fontSize:10,color:'#cbd5e1'}}>Less</span>
              {[.12,.35,.55,.75,.95].map((o,i)=><div key={i} style={{width:12,height:12,borderRadius:3,background:`rgba(99,102,241,${o})`}}/>)}
              <span style={{fontSize:10,color:'#cbd5e1'}}>More</span>
            </div>
          </div>
          <div style={S.card}>
            <p style={{margin:'0 0 14px',fontSize:11,fontWeight:700,color:'#94a3b8',letterSpacing:'.5px'}}>📊 BY CATEGORY</p>
            {Object.keys(catTotals).length===0
              ?<p style={{color:'#cbd5e1',fontSize:13,textAlign:'center',padding:'12px 0',margin:0}}>No data yet</p>
              :Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([c,sv])=>(
                <div key={c} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                    <span style={{fontWeight:600,color:'#475569'}}>{c}</span>
                    <span style={{color:'#94a3b8'}}>{fmtHrs(sv)}</span>
                  </div>
                  <div style={{background:'#f1f5f9',borderRadius:6,height:8}}>
                    <div style={{background:CAT_COLORS[c]||'#6366f1',height:8,borderRadius:6,width:`${(sv/catMax)*100}%`,transition:'width .5s'}}/>
                  </div>
                </div>
              ))
            }
          </div>
          <div style={S.card}>
            <p style={{margin:'0 0 14px',fontSize:11,fontWeight:700,color:'#94a3b8',letterSpacing:'.5px'}}>😌 MOOD BREAKDOWN</p>
            <div style={{display:'flex',justifyContent:'space-around'}}>
              {MOODS.map(m=>{
                const cnt=sessions.filter(s=>s.mood===m.e).length;
                return<div key={m.e} style={{textAlign:'center'}}>
                  <div style={{fontSize:30,marginBottom:4}}>{m.e}</div>
                  <div style={{fontSize:18,fontWeight:800,color:'#1e293b'}}>{cnt}</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>{m.l}</div>
                </div>;
              })}
            </div>
          </div>
          <div style={{...S.card,background:'#fffbeb'}}>
            <p style={{margin:'0 0 4px',fontSize:11,fontWeight:700,color:'#d97706',letterSpacing:'.5px'}}>🦋 DISTRACTION INSIGHTS</p>
            {sessions.length===0
              ?<p style={{margin:0,fontSize:13,color:'#92400e'}}>No data yet — start tracking!</p>
              :(()=>{
                const total=sessions.reduce((a,s)=>a+(s.dist||0),0);
                const avg=(total/sessions.length).toFixed(1);
                const best=sessions.filter(s=>s.dist===0).length;
                return<>
                  <p style={{margin:'4px 0 0',fontSize:13,color:'#92400e'}}><strong>{total}</strong> total distractions · avg <strong>{avg}</strong> per session</p>
                  <p style={{margin:'4px 0 0',fontSize:12,color:'#b45309'}}>{best} session{best!==1?'s':''} with zero distractions 🏆</p>
                </>;
              })()
            }
          </div>
        </>}
      </div>

      {moodModal&&<div style={S.moodOverlay}>
        <div style={S.moodSheet}>
          <p style={{margin:0,fontSize:16,fontWeight:800,color:'#1e293b',textAlign:'center'}}>How did that feel? ✨</p>
          <p style={{margin:'6px 0 0',fontSize:12,color:'#94a3b8',textAlign:'center'}}>{moodModal.task} · {fmt(moodModal.dur)}</p>
          {moodModal.dist>0&&<p style={{margin:'4px 0 0',fontSize:12,color:'#f59e0b',textAlign:'center'}}>🦋 {moodModal.dist} distraction{moodModal.dist!==1?'s':''}</p>}
          <div style={S.moodGrid}>
            {MOODS.map(m=>(
              <button key={m.e} style={S.moodBtn} onClick={()=>doMood(m.e)}>
                <div>{m.e}</div>
                <div style={{fontSize:10,color:'#64748b',marginTop:4}}>{m.l}</div>
              </button>
            ))}
          </div>
        </div>
      </div>}

      {retroModal&&<div style={S.moodOverlay}>
        <div style={{...S.moodSheet,paddingBottom:28}}>
          <p style={{margin:'0 0 16px',fontSize:16,fontWeight:800,color:'#1e293b'}}>⏮ Log a Past Session</p>
          <input style={{...S.input,marginBottom:12}} placeholder="What did you work on?" value={retro.task} onChange={e=>setRetro(r=>({...r,task:e.target.value}))}/>
          <div style={S.catRow}>
            {CATS.map(c=><button key={c} style={S.catBtn(retro.cat===c,c)} onClick={()=>setRetro(r=>({...r,cat:c}))}>{c}</button>)}
          </div>
          <p style={{margin:'14px 0 6px',fontSize:12,color:'#64748b'}}>Duration: <strong>{retro.mins} minutes</strong></p>
          <input type="range" min={5} max={180} step={5} value={retro.mins} onChange={e=>setRetro(r=>({...r,mins:+e.target.value}))} style={{width:'100%',accentColor:'#6366f1'}}/>
          <p style={{margin:'12px 0 6px',fontSize:12,color:'#64748b'}}>How long ago: <strong>{retro.hoursAgo} hour{retro.hoursAgo!==1?'s':''}</strong></p>
          <input type="range" min={1} max={12} step={1} value={retro.hoursAgo} onChange={e=>setRetro(r=>({...r,hoursAgo:+e.target.value}))} style={{width:'100%',accentColor:'#6366f1'}}/>
          <p style={{margin:'12px 0 8px',fontSize:12,color:'#64748b'}}>How did it feel?</p>
          <div style={{display:'flex',gap:8}}>
            {MOODS.map(m=><button key={m.e} onClick={()=>setRetro(r=>({...r,mood:m.e}))} style={{...S.moodBtn,flex:1,padding:'10px 4px',outline:retro.mood===m.e?'2px solid #6366f1':'none'}}>{m.e}</button>)}
          </div>
          <div style={{display:'flex',gap:10,marginTop:16}}>
            <button style={{flex:1,padding:'13px',borderRadius:12,fontSize:14,border:'none',background:'#f1f5f9',color:'#64748b',cursor:'pointer'}} onClick={()=>setRetroModal(false)}>Cancel</button>
            <button style={{flex:1,padding:'13px',borderRadius:12,fontSize:14,fontWeight:700,border:'none',background:retro.task.trim()?'#6366f1':'#c7d2fe',color:'#fff',cursor:retro.task.trim()?'pointer':'not-allowed'}} disabled={!retro.task.trim()} onClick={doRetro}>Log It</button>
          </div>
        </div>
      </div>}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}
