import { useState, useEffect, useRef } from "react";

// ─── Notion DB IDs ────────────────────────────────────────────────────────────
const CLIENT_DB  = "334bc09b-53ce-80a9-82ec-000b8cffc130";
const CARD_DB    = "334bc09b-53ce-8026-a631-000b683d4ef9";
const WAIVER_DB  = "4e2e71c7-c056-421c-a58a-66914158dc7c";

// ─── Brand Palette ────────────────────────────────────────────────────────────
const C = {
  bg:'#F4FBF6', white:'#ffffff', alt:'#eaf7ef',
  main:'#008922', secondary:'#206100',
  border:'#b8dfc4', text:'#0d2615', muted:'#3a6647',
  light:'#7aaa83', danger:'#b91c1c',
  amber:'#92400e', amberBg:'rgba(180,130,0,0.10)',
};

// ─── Static Data ──────────────────────────────────────────────────────────────
const SERVICES = [
  { id:'Clean + Polish', label:'Clean + Polish',       price:8  },
  { id:'Lift',           label:'Lift — Edge & Corner', price:30, includesClean:true },
  { id:'Dent',           label:'Dent Correction',      price:50, includesClean:true },
  { id:'Crease',         label:'Crease Correction',    price:70, includesClean:true },
];
const CONDITIONS      = ['NM','LP','MP','HP','DMG'];
const CONTACT_METHODS = ['Email','Text','Facebook','Instagram'];
const PAYMENT_TYPES   = ['Cash','PayPal','Venmo','Zelle'];
const STEP_NAMES      = ['Client Info','Cards','Waiver','Payment','Review'];

// awaiting_approval = intake done, owner hasn't approved yet (not in Notion)
// pending → in_progress → complete → picked_up live in Notion
const STATUS_CONFIG = {
  awaiting_approval:{ label:'Awaiting Approval', bg:'rgba(180,130,0,0.12)', color:'#7a4d00' },
  pending:          { label:'Pending',            bg:'rgba(161,100,0,0.10)', color:'#7a4d00' },
  in_progress:      { label:'In Progress',        bg:'rgba(0,137,34,0.12)',  color:'#005c18' },
  complete:         { label:'Complete',           bg:'rgba(20,70,200,0.09)', color:'#1a3a8a' },
  picked_up:        { label:'Picked Up',          bg:'rgba(100,50,160,0.09)',color:'#4a1a8a' },
};
const STATUS_NEXT = { pending:'in_progress', in_progress:'complete', complete:'picked_up' };
const STATUS_BTN  = { pending:'Start →', in_progress:'Complete ✓', complete:'Mark Picked Up' };

const WAIVER_SECTIONS = [
  { t:'1. Services & Pricing', b:"Just Mint Card Care provides card cleaning and restoration services on collectible trading cards including Pokémon and other TCG cards. Prices per card (USD): Clean + Polish — $8; Lift/Edge & Corner Correction (includes Clean + Polish) — $30; Dent Correction (includes Clean + Polish) — $50; Crease Correction (includes Clean + Polish) — $70. Cards requiring multiple corrections will be quoted as a single service before work begins." },
  { t:'2. How the Process Works', b:"Step 1 — Request a Quote: Share photos and a card list before drop-off. Step 2 — Approve the Quote: Your signature confirms agreement to scope, pricing, and this Agreement. Step 3 — Pay & Drop Off: Full payment is due at or before drop-off. Work begins only after payment and signed quote. Drop-off by appointment in Minneapolis. Step 4 — Pre-Condition Documentation: Every card is photographed before work begins. Step 5 — Restoration: Unexpected issues pause work until you are contacted. Step 6 — Pick Up: Cards returned in protective sleeves and toploaders." },
  { t:'3. Payment', b:"Full payment is required before work begins. We accept PayPal, Venmo, Zelle, and cash. All prices in USD. Scope changes require a revised quote; you are not obligated to accept." },
  { t:'4. Risks of Card Restoration', b:"4.1 Risk of Worsening: A card's condition may worsen during restoration even with care. 4.2 Pre-Existing Damage: Just Mint Card Care is not responsible for damage documented at intake. 4.3 No Grading Guarantees: We make no guarantees regarding grading outcomes. 4.4 Severely Damaged Cards: If proceeding poses high risk, we contact you first. Choosing to proceed means accepting that risk." },
  { t:'5. Cancellations & Refunds', b:"Cancel before drop-off for a full refund. Once work begins on a card, that fee is non-refundable. If we cannot safely complete a service, we refund that card's fee in full." },
  { t:'6. Your Responsibilities', b:"Provide accurate card condition and authenticity information. Do not submit counterfeit or altered cards — grounds for immediate refusal and forfeiture of fees. Ensure drop-off cards match the approved quote. Provide accurate contact information and communicate promptly if details change." },
  { t:'7. Turnaround Time', b:"We commit to completing your batch within 1 Month of drop-off under normal circumstances and will notify you of any significant delay." },
  { t:'8. Claims & Disputes', b:"Claims must be submitted within 5 days of pick-up at justminttcg@gmail.com. Include photos or video. We respond within 3 business days. Unresolved disputes handled under Minnesota law." },
  { t:'9. Liability', b:"Just Mint TCG's liability is limited to service fees paid for affected cards. Compensation for our error is based on fair market value at drop-off. Not liable for pre-existing damage, grading outcomes, post-pickup damage, or unrelated losses." },
  { t:'10. Your Information', b:"We collect your name, contact info, and card details solely to manage your order. We do not sell or share personal information. Photos used for marketing only with your written consent. Records retained for 1 year." },
  { t:'11. Governing Law', b:"This Agreement is governed by the laws of the State of Minnesota. Disputes will be handled in the courts of Hennepin County, Minnesota." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const emptyForm = () => ({
  clientName:'', clientEmail:'', clientPhone:'', contactMethod:'',
  cards:[], agreed:false, paymentType:'',
});
const emptyCard = () => ({ cardName:'', year:'', cardNumber:'', condition:'', service:'' });
const genId = (list) => {
  const max = list.reduce((m,o)=>Math.max(m,parseInt(o.id.replace('ORD-',''),10)||0),0);
  return `ORD-${String(max+1).padStart(3,'0')}`;
};
const batchTotal = (cards) =>
  cards.reduce((s,c)=>s+(SERVICES.find(x=>x.id===c.service)?.price||0),0);
const hasDraftContent = (d) =>
  !!(d.cardName.trim()||d.year.trim()||d.cardNumber.trim());

// ─── Storage ──────────────────────────────────────────────────────────────────
async function loadOrders() {
  try { const r=await window.storage.get('jm_orders'); return r?JSON.parse(r.value):[]; }
  catch { return []; }
}
async function saveOrders(orders) {
  try { await window.storage.set('jm_orders', JSON.stringify(orders)); }
  catch(e) { console.error('Storage error:',e); }
}

// ─── Notion API — calls Vercel serverless functions ──────────────────────────
// These routes hold the NOTION_TOKEN securely on the server side.
// Set NOTION_TOKEN in your Vercel project → Settings → Environment Variables.

async function syncOrderToNotion(order) {
  const res = await fetch("/api/sync-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!res.ok) throw new Error(`sync-order failed: ${res.status}`);
  return res.json(); // { success, clientUrl, orderUrls }
}

async function createWaiverPage(order) {
  const res = await fetch("/api/create-waiver", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!res.ok) throw new Error(`create-waiver failed: ${res.status}`);
  return res.json(); // { success, waiverUrl }
}

// Update card order statuses when owner advances an order
async function updateNotionStatus(order, newStatus) {
  const urls = order.notionOrderUrls || [];
  if (!urls.length) return;
  fetch("/api/update-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderUrls: urls, status: newStatus }),
  }).catch(() => {});
}


// ─── Shared Styles ────────────────────────────────────────────────────────────
const IS = (err) => ({
  width:'100%', padding:'10px 12px', borderRadius:8, boxSizing:'border-box',
  border:`1.5px solid ${err?C.danger:C.border}`,
  background:C.white, color:C.text, fontSize:15, fontFamily:'inherit',
  outline:'none', WebkitAppearance:'none', appearance:'none',
});
const LS = { fontSize:11, fontWeight:700, color:C.muted, marginBottom:5, display:'block', letterSpacing:'0.07em', textTransform:'uppercase' };
function Err({m}){ return m?<span style={{fontSize:12,color:C.danger,display:'block',marginTop:4}}>{m}</span>:null; }

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({status}){
  const s=STATUS_CONFIG[status]||STATUS_CONFIG.pending;
  return <span style={{fontSize:10,padding:'3px 10px',borderRadius:3,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',background:s.bg,color:s.color}}>{s.label}</span>;
}
function SyncBadge({notionSync}){
  const map={
    synced: {t:'✓ Notion',   bg:'rgba(0,137,34,0.08)',   c:C.main  },
    pending:{t:'⟳ Syncing…', bg:'rgba(0,137,34,0.08)',   c:C.main  },
    failed: {t:'⚠ Sync failed',bg:'rgba(185,28,28,0.08)',c:C.danger},
    none:   {t:'○ Not synced',bg:'rgba(0,0,0,0.05)',      c:C.muted },
  };
  const s=map[notionSync]||map.none;
  return <span style={{fontSize:9,padding:'2px 8px',borderRadius:3,fontWeight:600,letterSpacing:'0.06em',background:s.bg,color:s.c}}>{s.t}</span>;
}

// ─── Signature Pad ────────────────────────────────────────────────────────────
function SignaturePad({onDataChange}){
  const ref=useRef(null), drawing=useRef(false), last=useRef(null);
  useEffect(()=>{ const c=ref.current; if(!c)return; c.width=c.offsetWidth; c.height=150; },[]);
  const xy=(e)=>{ const c=ref.current,r=c.getBoundingClientRect(),src=e.touches?e.touches[0]:e; return{x:(src.clientX-r.left)*(c.width/r.width),y:(src.clientY-r.top)*(c.height/r.height)}; };
  const down=(e)=>{ e.preventDefault(); drawing.current=true; last.current=xy(e); };
  const move=(e)=>{ e.preventDefault(); if(!drawing.current)return; const c=ref.current,ctx=c.getContext('2d'),pt=xy(e); ctx.beginPath(); ctx.moveTo(last.current.x,last.current.y); ctx.lineTo(pt.x,pt.y); ctx.strokeStyle=C.secondary; ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.stroke(); last.current=pt; onDataChange(c.toDataURL()); };
  const up=(e)=>{ e.preventDefault(); drawing.current=false; };
  const clear=()=>{ const c=ref.current; c.getContext('2d').clearRect(0,0,c.width,c.height); onDataChange(null); };
  return (
    <div>
      <div style={{position:'relative'}}>
        <canvas ref={ref} style={{display:'block',width:'100%',height:'150px',borderRadius:8,border:`1.5px solid ${C.border}`,background:C.white,touchAction:'none',cursor:'crosshair'}}
          onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
          onTouchStart={down} onTouchMove={move} onTouchEnd={up}/>
        <button type="button" onClick={clear} style={{position:'absolute',top:8,right:8,fontSize:11,padding:'4px 12px',borderRadius:5,background:'rgba(255,255,255,0.92)',border:`1px solid ${C.border}`,color:C.muted,cursor:'pointer'}}>Clear</button>
      </div>
      <p style={{fontSize:11,color:C.light,margin:'5px 0 0'}}>Sign using your mouse, stylus, or finger.</p>
    </div>
  );
}

// ─── Unsaved Card Warning ─────────────────────────────────────────────────────
function UnsavedCardWarning({onDiscard, onGoBack}){
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(13,38,21,0.75)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 20px'}}>
      <div style={{background:C.white,borderRadius:14,padding:'24px 20px',maxWidth:340,width:'100%'}}>
        <div style={{fontSize:22,marginBottom:8,textAlign:'center'}}>⚠️</div>
        <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:8,textAlign:'center'}}>Unsaved Card</div>
        <p style={{fontSize:14,color:C.muted,lineHeight:1.6,marginBottom:20,textAlign:'center'}}>
          You have card details typed in but haven't tapped <strong>Add Card</strong> yet. Go back to add it, or discard and continue without it.
        </p>
        <div style={{display:'flex',gap:10}}>
          <button type="button" onClick={onDiscard} style={{flex:1,padding:'12px',borderRadius:8,fontSize:14,background:C.bg,border:`1.5px solid ${C.border}`,color:C.muted,cursor:'pointer',fontFamily:'inherit'}}>Discard & Continue</button>
          <button type="button" onClick={onGoBack} style={{flex:1,padding:'12px',borderRadius:8,fontSize:14,fontWeight:700,background:C.main,border:'none',color:'#fff',cursor:'pointer',fontFamily:'inherit'}}>Go Back & Add</button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Client Info ──────────────────────────────────────────────────────
function StepClientInfo({form,setForm,errors}){
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div><label style={LS}>Client Name *</label><input style={IS(errors.clientName)} value={form.clientName} onChange={f('clientName')} placeholder="Full legal name"/><Err m={errors.clientName}/></div>
      <div><label style={LS}>Email *</label><input type="email" inputMode="email" style={IS(errors.clientEmail)} value={form.clientEmail} onChange={f('clientEmail')} placeholder="client@email.com" autoCapitalize="none"/><Err m={errors.clientEmail}/></div>
      <div><label style={LS}>Phone *</label><input type="tel" inputMode="tel" style={IS(errors.clientPhone)} value={form.clientPhone} onChange={f('clientPhone')} placeholder="(612) 555-0000"/><Err m={errors.clientPhone}/></div>
      <div>
        <label style={LS}>Preferred Contact Method *</label>
        <select style={IS(errors.contactMethod)} value={form.contactMethod} onChange={f('contactMethod')}>
          <option value="">Select method…</option>
          {CONTACT_METHODS.map(m=><option key={m}>{m}</option>)}
        </select>
        <Err m={errors.contactMethod}/>
      </div>
    </div>
  );
}

// ─── Step 2: Cards ────────────────────────────────────────────────────────────
function StepCards({form,setForm,errors,draft,setDraft,draftErr,setDraftErr}){
  const [adding,setAdding]=useState(form.cards.length===0);
  const df=k=>e=>setDraft(p=>({...p,[k]:e.target.value}));
  const validateDraft=()=>{ const e={}; if(!draft.cardName.trim())e.cardName='Card name required'; if(!draft.year.trim())e.year='Year required'; else if(!/^\d{4}$/.test(draft.year.trim()))e.year='Enter a 4-digit year'; if(!draft.condition)e.condition='Select a condition'; if(!draft.service)e.service='Select a service'; return e; };
  const addCard=()=>{ const e=validateDraft(); if(Object.keys(e).length){setDraftErr(e);return;} setForm(p=>({...p,cards:[...p.cards,{...draft}]})); setDraft(emptyCard()); setDraftErr({}); setAdding(false); };
  const removeCard=i=>setForm(p=>({...p,cards:p.cards.filter((_,idx)=>idx!==i)}));
  const total=batchTotal(form.cards);
  const draftSvc=SERVICES.find(s=>s.id===draft.service);
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {form.cards.length===0&&!adding&&(<div style={{textAlign:'center',padding:'28px 20px',color:C.muted,fontSize:13,lineHeight:1.6,background:C.alt,borderRadius:10,border:`1px dashed ${C.border}`}}>No cards added yet.<br/>Tap <strong>+ Add Card</strong> below to start.</div>)}
      {form.cards.map((card,i)=>{ const svc=SERVICES.find(s=>s.id===card.service); return (<div key={i} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{card.cardName} ({card.year})</div><div style={{fontSize:12,color:C.muted,marginTop:3}}>{card.condition} · {svc?.label} · ${svc?.price}{card.cardNumber?` · #${card.cardNumber}`:''}</div></div><button type="button" onClick={()=>removeCard(i)} style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:6,color:C.danger,fontSize:18,lineHeight:1,padding:'4px 10px',cursor:'pointer',flexShrink:0}}>×</button></div>); })}
      {adding&&(
        <div style={{background:C.white,border:`1.5px solid ${C.main}`,borderRadius:10,padding:'16px 14px',display:'flex',flexDirection:'column',gap:12}}>
          <div style={{fontSize:12,fontWeight:700,color:C.main,textTransform:'uppercase',letterSpacing:'0.07em'}}>{form.cards.length>0?`Card ${form.cards.length+1}`:'Card Details'}</div>
          <div><label style={LS}>Card Name *</label><input style={IS(draftErr.cardName)} value={draft.cardName} onChange={df('cardName')} placeholder="e.g. Charizard Holo" autoComplete="off"/><Err m={draftErr.cardName}/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><label style={LS}>Year *</label><input style={IS(draftErr.year)} value={draft.year} onChange={df('year')} placeholder="1999" maxLength={4} inputMode="numeric"/><Err m={draftErr.year}/></div>
            <div><label style={LS}>Card #</label><input style={IS()} value={draft.cardNumber} onChange={df('cardNumber')} placeholder="4/102"/></div>
          </div>
          <div><label style={LS}>Condition *</label><select style={IS(draftErr.condition)} value={draft.condition} onChange={df('condition')}><option value="">Select…</option>{CONDITIONS.map(c=><option key={c}>{c}</option>)}</select><Err m={draftErr.condition}/></div>
          <div><label style={LS}>Service *</label><select style={IS(draftErr.service)} value={draft.service} onChange={df('service')}><option value="">Select service…</option>{SERVICES.map(s=><option key={s.id} value={s.id}>{s.label} — ${s.price}</option>)}</select><Err m={draftErr.service}/></div>
          {draftSvc?.includesClean&&<div style={{fontSize:12,color:C.main,background:C.alt,borderRadius:6,padding:'8px 10px'}}>✓ Includes Clean + Polish at no extra charge</div>}
          {!draft.service&&<div style={{fontSize:11,color:C.muted,fontStyle:'italic'}}>Note: Lift, Dent, and Crease include Clean + Polish.</div>}
          <div style={{display:'flex',gap:8}}>
            {form.cards.length>0&&<button type="button" onClick={()=>{setAdding(false);setDraftErr({});setDraft(emptyCard());}} style={{flex:1,padding:'11px',borderRadius:8,fontSize:14,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>}
            <button type="button" onClick={addCard} style={{flex:2,padding:'11px',borderRadius:8,fontSize:14,fontWeight:700,background:C.main,border:'none',color:'#fff',cursor:'pointer',fontFamily:'inherit'}}>Add Card</button>
          </div>
        </div>
      )}
      {!adding&&<button type="button" onClick={()=>setAdding(true)} style={{width:'100%',padding:'13px',borderRadius:8,fontSize:14,fontWeight:600,background:'transparent',border:`2px dashed ${C.border}`,color:C.main,cursor:'pointer',fontFamily:'inherit'}}>+ Add Card to Batch</button>}
      <Err m={errors.cards}/>
      {form.cards.length>0&&(<div style={{background:C.alt,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:C.muted}}>{form.cards.length} card{form.cards.length!==1?'s':''} in batch</span><span style={{fontSize:20,fontWeight:800,color:C.main}}>${total}</span></div>)}
    </div>
  );
}

// ─── Step 3: Waiver ───────────────────────────────────────────────────────────
function StepWaiver({form,setForm,sigData,setSigData,errors}){
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div>
        <label style={LS}>Service Agreement — Scroll to read in full</label>
        <div style={{height:220,overflowY:'auto',border:`1.5px solid ${C.border}`,borderRadius:8,padding:'14px 16px',background:C.white,fontSize:12.5,lineHeight:1.75,color:C.text,WebkitOverflowScrolling:'touch'}}>
          <div style={{textAlign:'center',marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:14,color:C.secondary,fontFamily:"Georgia,serif"}}>JUST MINT TCG — Card Cleaning Co.</div>
            <div style={{fontSize:11,fontStyle:'italic',color:C.muted,marginTop:2}}>Mint condition. Every time.</div>
            <div style={{fontSize:11,color:C.light,marginTop:4}}>Minneapolis, Minnesota · Version 1.0 · Effective 4/29/2026</div>
          </div>
          <p style={{marginBottom:14}}>This Client Service Agreement ("Agreement") is between Just Mint TCG — Card Cleaning Co. ("Just Mint Card Care," "we," or "us") and the client signing below ("you" or "Client"). By signing, you agree to all terms. Please read fully before dropping off any cards.</p>
          {WAIVER_SECTIONS.map(s=>(<div key={s.t} style={{marginBottom:12}}><div style={{fontWeight:700,color:C.secondary,marginBottom:4}}>{s.t}</div><div>{s.b}</div></div>))}
          <div style={{marginTop:14,padding:'10px 12px',background:C.alt,borderRadius:6,fontSize:11.5,color:C.muted,lineHeight:1.6}}>By signing below, you confirm you have read this Agreement in full, agree to all terms, are at least 18 years of age (or have parental authorization), and that your card information is accurate.</div>
        </div>
      </div>
      <div><label style={LS}>Client Signature *</label><SignaturePad onDataChange={setSigData}/><Err m={errors.signature}/></div>
      <label style={{display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer'}}>
        <input type="checkbox" checked={form.agreed||false} onChange={e=>setForm(p=>({...p,agreed:e.target.checked}))} style={{marginTop:2,accentColor:C.main,width:18,height:18,flexShrink:0,cursor:'pointer'}}/>
        <span style={{fontSize:14,color:C.text,lineHeight:1.5}}>I have read and agree to the Just Mint Card Care Service Agreement in full.</span>
      </label>
      <Err m={errors.agreed}/>
    </div>
  );
}

// ─── Step 4: Payment ──────────────────────────────────────────────────────────
function StepPayment({form,setForm,errors}){
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <p style={{fontSize:14,color:C.muted,margin:0}}>Select the payment method for this order:</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {PAYMENT_TYPES.map(pt=>{ const a=form.paymentType===pt; return <button key={pt} type="button" onClick={()=>setForm(p=>({...p,paymentType:pt}))} style={{padding:'20px 12px',borderRadius:10,cursor:'pointer',fontSize:15,fontFamily:'inherit',fontWeight:a?700:400,border:`2px solid ${a?C.main:C.border}`,background:a?C.alt:C.white,color:a?C.main:C.text}}>{pt}</button>; })}
      </div>
      <Err m={errors.paymentType}/>
    </div>
  );
}

// ─── Step 5: Review ───────────────────────────────────────────────────────────
function StepReview({form}){
  const total=batchTotal(form.cards);
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:C.alt,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
        <div style={{fontSize:10,color:C.muted,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Client</div>
        <div style={{fontSize:15,fontWeight:700,color:C.text}}>{form.clientName}</div>
        <div style={{fontSize:12,color:C.muted,marginTop:3}}>{form.clientEmail} · {form.clientPhone}</div>
        <div style={{fontSize:12,color:C.muted,marginTop:2}}>{form.contactMethod} · {form.paymentType}</div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        <div style={{fontSize:10,color:C.muted,textTransform:'uppercase',letterSpacing:'0.07em'}}>Batch — {form.cards.length} card{form.cards.length!==1?'s':''}</div>
        {form.cards.map((card,i)=>{ const svc=SERVICES.find(s=>s.id===card.service); return (<div key={i} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{card.cardName} ({card.year}){card.cardNumber?` #${card.cardNumber}`:''}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{card.condition} · {svc?.label}</div></div><div style={{fontSize:15,fontWeight:700,color:C.main}}>${svc?.price}</div></div>); })}
      </div>
      <div style={{background:C.white,border:`2px solid ${C.main}`,borderRadius:10,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{fontSize:10,color:C.muted,textTransform:'uppercase',letterSpacing:'0.07em'}}>Batch Total</div><div style={{fontSize:11,color:C.light,marginTop:2}}>✓ Waiver signed · {new Date().toLocaleDateString('en-US')}</div></div>
        <div style={{fontSize:28,fontWeight:800,color:C.main}}>${total}</div>
      </div>
      <div style={{background:C.amberBg,border:'1px solid rgba(180,130,0,0.25)',borderRadius:8,padding:'12px 14px',fontSize:13,color:C.amber,lineHeight:1.5}}>
        ⏳ This order saves as <strong>Awaiting Approval</strong>. Expand it in your order list and tap <strong>Approve Order</strong> whenever you're ready to begin work — it will sync to Notion at that point.
      </div>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({order,onAdvance,onApprove,onRetrySync}){
  const [expanded,setExpanded]=useState(false);
  const total=batchTotal(order.cards||[]);
  const isAwaiting=order.status==='awaiting_approval';
  const canAdvance=!isAwaiting&&order.status!=='picked_up';
  return (
    <div style={{background:C.white,border:`1px solid ${isAwaiting?'rgba(180,130,0,0.4)':C.border}`,borderRadius:12,marginBottom:10,overflow:'hidden'}}>
      <div style={{padding:'14px 16px',cursor:'pointer'}} onClick={()=>setExpanded(x=>!x)}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
          <div style={{flex:1,marginRight:10}}>
            <div style={{fontSize:15,fontWeight:700,color:C.text,lineHeight:1.3}}>{order.clientName}</div>
            <div style={{fontSize:11,color:C.light,marginTop:1}}>{order.id} · {order.dateCreated}</div>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontSize:18,fontWeight:800,color:C.main}}>${total}</div>
            <div style={{fontSize:10,color:C.muted}}>{order.cards?.length||0} card{(order.cards?.length||0)!==1?'s':''}</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <StatusBadge status={order.status}/>
          {!isAwaiting&&<SyncBadge notionSync={order.notionSync}/>}
          <span style={{fontSize:10,color:C.light,marginLeft:'auto'}}>{expanded?'▲ Hide':'▼ Show'}</span>
        </div>
      </div>
      {expanded&&(
        <div style={{borderTop:`1px solid ${C.border}`,padding:'12px 16px',background:C.bg}}>
          <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:12}}>
            {(order.cards||[]).map((card,i)=>{ const svc=SERVICES.find(s=>s.id===card.service); return (<div key={i} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:7,padding:'9px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{card.cardName} ({card.year}){card.cardNumber?` #${card.cardNumber}`:''}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{card.condition} · {svc?.label}</div></div><div style={{fontSize:14,fontWeight:700,color:C.main}}>${svc?.price}</div></div>); })}
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {isAwaiting&&(<button type="button" onClick={()=>onApprove(order.id)} style={{flex:2,fontSize:13,padding:'11px 12px',borderRadius:7,background:C.secondary,color:'#fff',border:'none',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✓ Approve Order & Sync to Notion</button>)}
            {canAdvance&&(<button type="button" onClick={()=>onAdvance(order.id)} style={{flex:1,fontSize:13,padding:'9px 12px',borderRadius:7,background:C.main,color:'#fff',border:'none',fontWeight:600,cursor:'pointer',fontFamily:'inherit',minWidth:120}}>{STATUS_BTN[order.status]}</button>)}
            {!isAwaiting&&order.notionSync==='failed'&&(<button type="button" onClick={()=>onRetrySync(order.id)} style={{flex:1,fontSize:13,padding:'9px 12px',borderRadius:7,background:C.bg,color:C.muted,border:`1px solid ${C.border}`,cursor:'pointer',fontFamily:'inherit',minWidth:100}}>↻ Retry Sync</button>)}
          </div>
          <div style={{fontSize:10,color:C.light,marginTop:10}}>{order.paymentType} · {order.contactMethod} · Intake {order.waiverSignedAt?new Date(order.waiverSignedAt).toLocaleString('en-US'):'—'}</div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App(){
  const [orders,     setOrders]     = useState([]);
  const [loaded,     setLoaded]     = useState(false);
  const [tab,        setTab]        = useState('active');
  const [search,     setSearch]     = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [step,       setStep]       = useState(1);
  const [form,       setForm]       = useState(emptyForm);
  const [draft,      setDraft]      = useState(emptyCard);
  const [draftErr,   setDraftErr]   = useState({});
  const [sigData,    setSigData]    = useState(null);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showWarn,   setShowWarn]   = useState(false);

  useEffect(()=>{ loadOrders().then(o=>{ setOrders(o); setLoaded(true); }); },[]);
  useEffect(()=>{ if(loaded) saveOrders(orders); },[orders,loaded]);

  const openModal=()=>{ setForm(emptyForm()); setDraft(emptyCard()); setDraftErr({}); setSigData(null); setErrors({}); setStep(1); setShowModal(true); };

  const validate=(s)=>{
    const e={};
    if(s===1){ if(!form.clientName.trim())e.clientName='Client name is required'; if(!form.clientEmail.trim())e.clientEmail='Email is required'; else if(!/\S+@\S+\.\S+/.test(form.clientEmail))e.clientEmail='Enter a valid email'; if(!form.clientPhone.trim())e.clientPhone='Phone number is required'; if(!form.contactMethod)e.contactMethod='Select a contact method'; }
    if(s===2){ if(form.cards.length===0)e.cards='Add at least one card to continue'; }
    if(s===3){ if(!sigData)e.signature='Please provide a signature above'; if(!form.agreed)e.agreed='You must agree to the terms to continue'; }
    if(s===4){ if(!form.paymentType)e.paymentType='Please select a payment method'; }
    return e;
  };

  const next=()=>{
    if(step===2&&hasDraftContent(draft)){ setShowWarn(true); return; }
    const e=validate(step); if(Object.keys(e).length){setErrors(e);return;}
    setErrors({}); setStep(p=>p+1);
  };
  const back=()=>{ setErrors({}); setStep(p=>p-1); };

  const handleDiscard=()=>{
    setDraft(emptyCard()); setDraftErr({}); setShowWarn(false);
    const e=validate(2); if(Object.keys(e).length){setErrors(e);return;}
    setErrors({}); setStep(3);
  };

  const submit=()=>{
    setSubmitting(true);
    const newOrder={ id:genId(orders), clientName:form.clientName, clientEmail:form.clientEmail, clientPhone:form.clientPhone, contactMethod:form.contactMethod, cards:form.cards, paymentType:form.paymentType, signatureDataUrl:sigData, status:'awaiting_approval', dateCreated:new Date().toLocaleDateString('en-US'), waiverSignedAt:new Date().toISOString(), notionSync:'none', notionOrderUrls:[] };
    setOrders(prev=>[newOrder,...prev]);
    setSubmitting(false); setShowModal(false);
  };

  // Owner approves → Notion sync + waiver page creation run in parallel
  const approveOrder=async(id)=>{
    setOrders(prev=>prev.map(o=>o.id!==id?o:{...o,notionSync:'pending'}));
    const order=orders.find(o=>o.id===id);
    try {
      const [result] = await Promise.all([
        syncOrderToNotion({...order,status:'pending'}),
        createWaiverPage(order).catch(e=>{ console.warn('Waiver page failed:',e); return null; }),
      ]);
      setOrders(prev=>prev.map(o=>o.id!==id?o:{...o,status:'pending',notionSync:'synced',notionClientUrl:result.clientUrl,notionOrderUrls:result.orderUrls||[]}));
    } catch {
      setOrders(prev=>prev.map(o=>o.id!==id?o:{...o,notionSync:'failed',status:'awaiting_approval'}));
    }
  };

  const advance=(id)=>{ const o=orders.find(x=>x.id===id); if(!o)return; const ns=STATUS_NEXT[o.status]; if(!ns)return; setOrders(prev=>prev.map(x=>x.id!==id?x:{...x,status:ns})); updateNotionStatus(o,ns); };

  const retrySync=async(id)=>{
    setOrders(prev=>prev.map(o=>o.id!==id?o:{...o,notionSync:'pending'}));
    const order=orders.find(o=>o.id===id);
    try { const r=await syncOrderToNotion(order); setOrders(prev=>prev.map(o=>o.id!==id?o:{...o,notionSync:'synced',notionClientUrl:r.clientUrl,notionOrderUrls:r.orderUrls||[]})); }
    catch { setOrders(prev=>prev.map(o=>o.id!==id?o:{...o,notionSync:'failed'})); }
  };

  const filtered=orders.filter(o=>{ const inTab=tab==='active'?o.status!=='picked_up':o.status==='picked_up'; const q=search.toLowerCase(); const hit=!q||[o.clientName,o.id,...(o.cards||[]).map(c=>c.cardName)].some(v=>(v||'').toLowerCase().includes(q)); return inTab&&hit; });
  const awaitingCount=orders.filter(o=>o.status==='awaiting_approval').length;
  const activeCount=orders.filter(o=>o.status!=='picked_up').length;
  const completedCount=orders.filter(o=>o.status==='picked_up').length;
  const pendingCount=orders.filter(o=>o.status==='pending').length;
  const inProgCount=orders.filter(o=>o.status==='in_progress').length;

  if(!loaded) return <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:13,color:C.light}}>Loading orders…</div></div>;

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif",maxWidth:500,margin:'0 auto',position:'relative'}}>

      {/* Header */}
      <div style={{background:C.secondary,padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 8px rgba(13,38,21,0.18)'}}>
        <div>
          <div style={{fontFamily:"Georgia,'Times New Roman',serif",fontSize:22,fontWeight:700,color:'#fff',letterSpacing:'0.02em'}}>Just Mint</div>
          <div style={{fontSize:9,color:'rgba(255,255,255,0.5)',letterSpacing:'0.18em',textTransform:'uppercase',marginTop:1}}>Card Care · Mint condition. Every time.</div>
        </div>
        <button type="button" onClick={openModal} style={{background:C.main,color:'#fff',border:'none',padding:'10px 18px',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>+ New Order</button>
      </div>

      {/* Awaiting approval banner */}
      {awaitingCount>0&&(
        <div style={{background:C.amberBg,borderBottom:'1px solid rgba(180,130,0,0.25)',padding:'10px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:13,color:C.amber,fontWeight:600}}>⏳ {awaitingCount} order{awaitingCount!==1?'s':''} awaiting your approval</span>
          <button type="button" onClick={()=>setTab('active')} style={{fontSize:11,color:C.amber,background:'transparent',border:'1px solid rgba(180,130,0,0.4)',borderRadius:5,padding:'3px 10px',cursor:'pointer',fontFamily:'inherit'}}>View</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',background:C.white,borderBottom:`1px solid ${C.border}`,padding:'0 18px'}}>
        {[['active','Active Orders',activeCount],['completed','Picked Up',completedCount]].map(([id,label,count])=>(
          <button key={id} type="button" onClick={()=>setTab(id)} style={{padding:'12px 14px',fontSize:13,fontWeight:tab===id?700:400,color:tab===id?C.main:C.muted,background:'transparent',border:'none',borderBottom:`2.5px solid ${tab===id?C.main:'transparent'}`,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:7}}>
            {label}<span style={{fontSize:11,padding:'1px 8px',borderRadius:10,background:tab===id?C.alt:'transparent',color:tab===id?C.main:C.light}}>{count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{padding:'12px 16px',background:C.white,borderBottom:`1px solid ${C.border}`}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by client, card name, or order ID…" style={{...IS(),fontSize:14,background:C.bg}}/>
      </div>

      {/* Order list */}
      <div style={{padding:'14px 16px',paddingBottom:100}}>
        {filtered.length===0?(
          <div style={{textAlign:'center',padding:'60px 20px',color:C.light}}>
            <div style={{fontSize:44,marginBottom:14,lineHeight:1}}>🃏</div>
            <div style={{fontSize:14,lineHeight:1.7}}>{search?'No orders match your search.':tab==='active'?'No active orders.\nTap + New Order to get started.':'No picked-up orders yet.'}</div>
          </div>
        ):filtered.map(o=><OrderCard key={o.id} order={o} onAdvance={advance} onApprove={approveOrder} onRetrySync={retrySync}/>)}
      </div>

      {/* Footer */}
      <div style={{position:'sticky',bottom:0,background:C.white,borderTop:`1px solid ${C.border}`,padding:'10px 20px',display:'flex',gap:24,zIndex:90}}>
        <div><div style={{fontSize:9,color:C.light,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:2}}>In Progress</div><div style={{fontSize:22,fontWeight:800,color:C.main}}>{inProgCount}</div></div>
        <div><div style={{fontSize:9,color:C.light,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:2}}>Pending</div><div style={{fontSize:22,fontWeight:800,color:C.amber}}>{pendingCount}</div></div>
        <div><div style={{fontSize:9,color:C.light,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:2}}>Total Orders</div><div style={{fontSize:22,fontWeight:800,color:C.text}}>{orders.length}</div></div>
      </div>

      {/* Modal */}
      {showModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(13,38,21,0.68)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={e=>{if(e.target===e.currentTarget)setShowModal(false);}}>
          <div style={{background:C.bg,width:'100%',maxWidth:500,maxHeight:'93dvh',borderRadius:'18px 18px 0 0',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'16px 18px',background:C.white,borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div><div style={{fontSize:16,fontWeight:700,color:C.secondary}}>New Order</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>Step {step} of 5 — {STEP_NAMES[step-1]}</div></div>
              <button type="button" onClick={()=>setShowModal(false)} style={{background:'transparent',border:'none',fontSize:22,color:C.muted,cursor:'pointer',padding:'4px 8px',lineHeight:1}}>✕</button>
            </div>
            <div style={{display:'flex',gap:4,padding:'10px 18px',background:C.white,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              {STEP_NAMES.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<step?C.main:C.border,transition:'background 0.2s'}}/>)}
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'20px 18px',WebkitOverflowScrolling:'touch'}}>
              {step===1&&<StepClientInfo form={form} setForm={setForm} errors={errors}/>}
              {step===2&&<StepCards form={form} setForm={setForm} errors={errors} draft={draft} setDraft={setDraft} draftErr={draftErr} setDraftErr={setDraftErr}/>}
              {step===3&&<StepWaiver form={form} setForm={setForm} sigData={sigData} setSigData={setSigData} errors={errors}/>}
              {step===4&&<StepPayment form={form} setForm={setForm} errors={errors}/>}
              {step===5&&<StepReview form={form}/>}
            </div>
            <div style={{padding:'14px 18px',background:C.white,borderTop:`1px solid ${C.border}`,display:'flex',gap:10,flexShrink:0}}>
              {step>1&&<button type="button" onClick={back} style={{flex:1,padding:'13px',borderRadius:8,fontSize:14,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>Back</button>}
              {step<5
                ?<button type="button" onClick={next} style={{flex:2,padding:'13px',borderRadius:8,fontSize:15,fontWeight:700,background:C.main,border:'none',color:'#fff',cursor:'pointer',fontFamily:'inherit'}}>Continue</button>
                :<button type="button" onClick={submit} disabled={submitting} style={{flex:2,padding:'13px',borderRadius:8,fontSize:15,fontWeight:700,background:submitting?C.light:C.secondary,border:'none',color:'#fff',cursor:submitting?'not-allowed':'pointer',fontFamily:'inherit'}}>{submitting?'Saving…':'Submit Order'}</button>
              }
            </div>
          </div>
        </div>
      )}

      {/* Unsaved card warning */}
      {showWarn&&<UnsavedCardWarning onDiscard={handleDiscard} onGoBack={()=>setShowWarn(false)}/>}
    </div>
  );
}