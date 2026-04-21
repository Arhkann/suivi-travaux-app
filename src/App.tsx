import { useState, useEffect, useCallback, useRef, type CSSProperties } from "react";

const BRAND = { navy:"#003B7A", red:"#E8001C", lightBlue:"#0072BB", bg:"#F4F7FB", border:"#D0DCEC", cardBg:"#FFFFFF", muted:"#5A7A99", success:"#1A7A3C", warning:"#B86000", danger:"#C0001A" };

const AGENTS_DEFAULT = ["Arienti Angelo","Arienti Nicolas","Blanc Celine","Bonasse Alain","Carta Rene","Chauderlot Thomas","Delpino Alain","Delpino Jerome","Estruch Sebastien","Idri Farid","Idri Liazid","Jal Laetitia","Jal Sebastien","Jaquier Franck","Kholer Marjorie","Perret Mickael","Sac Nicolas","Sadaoui Yacine","Sala Tony","Samourian Thomas","Selmi Nabil","Teichenne Jeremy","Traquini Anthony"];
const ZONES_DEFAULT = ["International","PC Fret","M1/M2","Arenc","Meridional","Cap Jannet","Poche 4","MPCT","Digue du large"];
const TYPE_TRAVAUX_DEFAULT = ["Peinture","Réparation grille/barrière","Utilisation engin","Réparation diverse"];
const ENGINS = ["Chariot élévateur","Manitou","Nacelle","Gerbeur"];
const COULEURS_PEINTURE = ["Blanc","Gris","Jaune sécurité","Rouge","Vert","Bleu","Orange","Noir"];
const PRIORITES = ["Normale","Urgente"];
const SAVE_KEY = "suivi_port_v3";
const TABS = ["Saisie","En cours","Tableau de bord","Archives","Paramètres"];

const initStock = () => ({
  peinture: COULEURS_PEINTURE.map((c,i)=>({id:i+1,ref:`P-${String(i+1).padStart(3,"0")}`,couleur:c,stock:8,seuil:3})),
  materiel:[
    {id:1,ref:"M-001",nom:"Grille standard",stock:8,seuil:2},
    {id:2,ref:"M-002",nom:"Barrière métallique",stock:5,seuil:2},
    {id:3,ref:"M-003",nom:"Visserie assortie (lot)",stock:20,seuil:5},
    {id:4,ref:"M-004",nom:"Charnière",stock:12,seuil:3},
    {id:5,ref:"M-005",nom:"Cadenas",stock:15,seuil:3},
  ],
  historique:[]
});

const emptyForm = () => ({agent:"",zone:"",type:"",description:"",date:new Date().toISOString().split("T")[0],couleur:"",nbPots:"",engin:"",materielId:"",qte:"",priorite:"Normale",photo:null});

const Logo = () => (
  <svg viewBox="0 0 220 60" xmlns="http://www.w3.org/2000/svg" style={{height:44,width:"auto"}}>
    <text x="0" y="32" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="28" fill="#003B7A">Marseille</text>
    <text x="148" y="32" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="28" fill="#E8001C">Fos</text>
    <text x="0" y="50" fontFamily="Arial,sans-serif" fontSize="11" fill="#5A7A99" letterSpacing="0.5">Le port euroméditerranéen</text>
    <polygon points="185,8 195,2 197,14" fill="#E8001C" opacity="0.9"/>
    <polygon points="196,4 208,0 208,12" fill="#E8001C" opacity="0.7"/>
    <polygon points="189,14 201,10 200,22" fill="#003B7A" opacity="0.8"/>
  </svg>
);

export default function App() {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [msg, setMsg] = useState(null);
  const [filterMois, setFilterMois] = useState(new Date().toISOString().slice(0,7));
  const [filterAgent, setFilterAgent] = useState("Tous");
  const [filterType, setFilterType] = useState("Tous");
  const [filterPrio, setFilterPrio] = useState("Tous");
  const [expandId, setExpandId] = useState(null);
  const [commentTexts, setCommentTexts] = useState({});
  const [paramTab, setParamTab] = useState("agents");
  const [newItem, setNewItem] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [paramMsg, setParamMsg] = useState(null);
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const photoRef = useRef();
  const saveTimer = useRef(null);

  const showMsg = (txt,ok=true) => { setMsg({txt,ok}); setTimeout(()=>setMsg(null),3000); };
  const showParamMsg = (txt,ok=true) => { setParamMsg({txt,ok}); setTimeout(()=>setParamMsg(null),3000); };

  useEffect(() => {
    const load = async () => {
      try {
        const raw = window.localStorage.getItem(SAVE_KEY);
        if (raw) setData(JSON.parse(raw));
        else setData({agents:AGENTS_DEFAULT,zones:ZONES_DEFAULT,types:TYPE_TRAVAUX_DEFAULT,stock:initStock(),travaux:[]});
      } catch { setData({agents:AGENTS_DEFAULT,zones:ZONES_DEFAULT,types:TYPE_TRAVAUX_DEFAULT,stock:initStock(),travaux:[]}); }
      setLoaded(true);
    };
    load();
  }, []);

  const saveData = useCallback(async (d) => { setSaving(true); try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch {} setSaving(false); }, []);

  const update = useCallback((fn) => {
    setData(prev => { const next=fn(prev); if(saveTimer.current)clearTimeout(saveTimer.current); saveTimer.current=setTimeout(()=>saveData(next),600); return next; });
  }, [saveData]);

  const hc = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const handlePhoto = e => { const file=e.target.files[0]; if(!file)return; const r=new FileReader(); r.onload=ev=>setForm(f=>({...f,photo:ev.target.result})); r.readAsDataURL(file); };

  const submit = () => {
    if (!form.agent||!form.zone||!form.type||!form.description||!form.date){showMsg("Champs obligatoires manquants",false);return;}
    let stockUpdates=null;
    if (form.type==="Peinture"){
      if(!form.couleur||!form.nbPots){showMsg("Précise la couleur et le nombre de pots",false);return;}
      const n=parseInt(form.nbPots)||0, idx=data.stock.peinture.findIndex(p=>p.couleur===form.couleur);
      if(idx===-1||data.stock.peinture[idx].stock<n){showMsg("Stock insuffisant",false);return;}
      stockUpdates={type:"peinture",idx,n,label:`${form.couleur} ×${n} pot(s)`,agent:form.agent};
    }
    if(form.type==="Réparation grille/barrière"&&form.materielId&&form.qte){
      const n=parseInt(form.qte)||0, idx=data.stock.materiel.findIndex(m=>m.id===parseInt(form.materielId));
      if(idx!==-1&&data.stock.materiel[idx].stock>=n) stockUpdates={type:"materiel",idx,n,label:`${data.stock.materiel[idx].nom} ×${n}`,agent:form.agent};
    }
    const entry={id:Date.now(),...form,statut:"En cours",archivedAt:null,commentaires:[]};
    update(prev=>{
      let st={...prev.stock,peinture:[...prev.stock.peinture],materiel:[...prev.stock.materiel],historique:[...prev.stock.historique]};
      if(stockUpdates){
        if(stockUpdates.type==="peinture") st.peinture[stockUpdates.idx]={...st.peinture[stockUpdates.idx],stock:st.peinture[stockUpdates.idx].stock-stockUpdates.n};
        if(stockUpdates.type==="materiel") st.materiel[stockUpdates.idx]={...st.materiel[stockUpdates.idx],stock:st.materiel[stockUpdates.idx].stock-stockUpdates.n};
        st.historique=[{id:Date.now(),date:form.date,action:"Consommation",detail:stockUpdates.label,agent:stockUpdates.agent},...st.historique.slice(0,199)];
      }
      return {...prev,stock:st,travaux:[entry,...prev.travaux]};
    });
    setForm(emptyForm()); showMsg("Intervention enregistrée"); setTab(1);
  };

  const terminer = id => update(p=>({...p,travaux:p.travaux.map(x=>x.id===id?{...x,statut:"Terminé",archivedAt:new Date().toISOString().split("T")[0]}:x)}));
  const archiver = id => update(p=>({...p,travaux:p.travaux.map(x=>x.id===id?{...x,statut:"Archivé"}:x)}));
  const rouvrir  = id => update(p=>({...p,travaux:p.travaux.map(x=>x.id===id?{...x,statut:"En cours",archivedAt:null}:x)}));

  const addComment = (id) => {
    const txt=(commentTexts[id]||"").trim(); if(!txt)return;
    update(p=>({...p,travaux:p.travaux.map(x=>x.id===id?{...x,commentaires:[...(x.commentaires||[]),{id:Date.now(),texte:txt,date:new Date().toISOString().split("T")[0]}]}:x)}));
    setCommentTexts(c=>({...c,[id]:""}));
  };

  const adjustStock=(type,idx,delta)=>update(p=>{
    const st={...p.stock,peinture:[...p.stock.peinture],materiel:[...p.stock.materiel],historique:[...p.stock.historique]};
    const nom = type==="peinture"?st.peinture[idx].couleur:st.materiel[idx].nom;
    if(type==="peinture") st.peinture[idx]={...st.peinture[idx],stock:Math.max(0,st.peinture[idx].stock+delta)};
    else st.materiel[idx]={...st.materiel[idx],stock:Math.max(0,st.materiel[idx].stock+delta)};
    st.historique=[{id:Date.now(),date:new Date().toISOString().split("T")[0],action:delta>0?"Réappro":"Retrait",detail:`${nom} ×${Math.abs(delta)}`,agent:"Manuel"},...st.historique.slice(0,199)];
    return {...p,stock:st};
  });

  const setSeuil=(type,idx,val)=>update(p=>{
    const st={...p.stock,peinture:[...p.stock.peinture],materiel:[...p.stock.materiel],historique:p.stock.historique};
    if(type==="peinture") st.peinture[idx]={...st.peinture[idx],seuil:parseInt(val)||0};
    else st.materiel[idx]={...st.materiel[idx],seuil:parseInt(val)||0};
    return {...p,stock:st};
  });

  const exportJSON=()=>{const a=document.createElement("a");a.href="data:application/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(data,null,2));a.download="sauvegarde_travaux.json";a.click();};
  const importJSON = e => {
  const file = e.target.files[0];
  if (!file) return;

  const r = new FileReader();
  r.onload = ev => {
    try {
      const text = typeof ev.target?.result === "string" ? ev.target.result : "";
      if (!text) {
        showMsg("Fichier invalide", false);
        return;
      }
      update(() => JSON.parse(text));
      showMsg("Données restaurées");
    } catch {
      showMsg("Fichier invalide", false);
    }
  };
  r.readAsText(file);
};
  const exportCSV=(rows,name)=>{const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(rows.map(r=>r.join(";")).join("\n"));a.download=name;a.click();};

  if(!loaded||!data) return <div style={{padding:"2rem",color:BRAND.muted,fontSize:14,background:BRAND.bg,minHeight:"100vh"}}>Chargement...</div>;

  const {agents,zones,types,stock,travaux}=data;
  const enCours=travaux.filter(t=>t.statut==="En cours");
  const termines=travaux.filter(t=>t.statut==="Terminé");
  const archives=travaux.filter(t=>t.statut==="Archivé");
  const alertes=[...stock.peinture.filter(p=>p.stock<=p.seuil).map(p=>({nom:p.couleur,stock:p.stock,seuil:p.seuil,type:"Peinture"})),...stock.materiel.filter(m=>m.stock<=m.seuil).map(m=>({nom:m.nom,stock:m.stock,seuil:m.seuil,type:"Matériel"}))];
  const filteredArchives=archives.filter(t=>(!filterMois||t.archivedAt?.slice(0,7)===filterMois)&&(filterAgent==="Tous"||t.agent===filterAgent)&&(filterType==="Tous"||t.type===filterType));
  const enCoursFilt=enCours.filter(t=>(filterPrio==="Tous"||t.priorite===filterPrio));
  const byAgentDash=agents.map(a=>({agent:a,enCours:enCours.filter(t=>t.agent===a).length,total:travaux.filter(t=>t.agent===a&&t.archivedAt?.slice(0,7)===filterMois).length,types:types.map(tp=>({type:tp,n:travaux.filter(t=>t.agent===a&&t.type===tp&&t.archivedAt?.slice(0,7)===filterMois).length}))})).filter(a=>a.enCours>0||a.total>0);
  const paramSections=[{key:"agents",label:"Agents",items:agents},{key:"zones",label:"Zones",items:zones},{key:"types",label:"Types",items:types}];

  const addParamItem=()=>{const v=newItem.trim();if(!v)return;const sec=paramSections.find(s=>s.key===paramTab);if(sec.items.map(x=>x.toLowerCase()).includes(v.toLowerCase())){showParamMsg("Existe déjà",false);return;}const sorted=[...sec.items,v].sort((a,b)=>a.localeCompare(b));update(p=>({...p,[paramTab]:sorted}));setNewItem("");showParamMsg(`${v} ajouté`);};
  const saveParamEdit=i=>{const v=editVal.trim();if(!v)return;update(p=>({...p,[paramTab]:p[paramTab].map((x,idx)=>idx===i?v:x)}));setEditIdx(null);showParamMsg("Modifié");};
  const deleteParamItem=i=>{update(p=>({...p,[paramTab]:p[paramTab].filter((_,idx)=>idx!==i)}));setConfirmDel(null);showParamMsg("Supprimé");};

  const inp: CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: `1px solid ${BRAND.border}`,
  borderRadius: 6,
  background: "#fff",
  color: BRAND.navy,
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
};

const lbl: CSSProperties = {
  fontSize: 12,
  color: BRAND.muted,
  marginBottom: 5,
  display: "block",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.4px",
};

const card: CSSProperties = {
  background: BRAND.cardBg,
  border: `1px solid ${BRAND.border}`,
  borderRadius: 10,
  padding: "1.1rem 1.3rem",
  marginBottom: 12,
  boxShadow: "0 1px 4px rgba(0,59,122,0.07)",
};

  const typeColors={Peinture:BRAND.lightBlue,"Réparation grille/barrière":BRAND.warning,"Utilisation engin":BRAND.success,"Réparation diverse":"#7A3B8F"};

  const TypeBadge=({type})=>{const c=typeColors[type]||BRAND.muted;return<span style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:c+"20",color:c,fontWeight:600,border:`1px solid ${c}30`}}>{type}</span>;};
  const PrioBadge=({p})=>p==="Urgente"?<span style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:BRAND.red+"20",color:BRAND.red,fontWeight:600,border:`1px solid ${BRAND.red}40`}}>URGENT</span>:null;

  const Btn=({color=BRAND.navy,children,onClick,style={}})=>(
    <button onClick={onClick} style={{padding:"6px 13px",border:`1px solid ${color}50`,borderRadius:6,background:`${color}12`,color,fontSize:12,cursor:"pointer",fontWeight:600,...style}}>{children}</button>
  );

  const TravailCard=({t,actions})=>{
    const open=expandId===t.id;
    return(
      <div style={{...card,borderLeft:`3px solid ${t.priorite==="Urgente"?BRAND.red:BRAND.lightBlue}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontWeight:700,fontSize:14,color:BRAND.navy}}>{t.agent}</span>
            <span style={{fontSize:12,color:BRAND.muted,background:BRAND.bg,padding:"2px 8px",borderRadius:4}}>{t.zone}</span>
            <PrioBadge p={t.priorite}/>
          </div>
          <span style={{fontSize:12,color:BRAND.muted,whiteSpace:"nowrap",marginLeft:8}}>{t.date}</span>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
          <TypeBadge type={t.type}/>
          {t.couleur&&<span style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:BRAND.bg,color:BRAND.muted,border:`1px solid ${BRAND.border}`}}>{t.couleur}{t.nbPots?` · ${t.nbPots} pot${t.nbPots>1?"s":""}`:""}</span>}
          {t.engin&&<span style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:BRAND.bg,color:BRAND.muted,border:`1px solid ${BRAND.border}`}}>{t.engin}</span>}
        </div>
        <p style={{fontSize:13,color:"#3a3a3a",margin:"0 0 10px",lineHeight:1.5}}>{t.description}</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {actions}
          <Btn color={BRAND.muted} onClick={()=>setExpandId(open?null:t.id)} style={{marginLeft:"auto"}}>{open?"Réduire":"Détails"}</Btn>
        </div>
        {open&&(
          <div style={{marginTop:12,borderTop:`1px solid ${BRAND.border}`,paddingTop:12}}>
            {t.photo&&<img src={t.photo} alt="photo" style={{maxWidth:"100%",borderRadius:8,marginBottom:10,maxHeight:200,objectFit:"cover",border:`1px solid ${BRAND.border}`}}/>}
            <p style={{fontSize:12,color:BRAND.muted,margin:"0 0 8px",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>Commentaires ({(t.commentaires||[]).length})</p>
            {(t.commentaires||[]).map(c=>(
              <div key={c.id} style={{background:BRAND.bg,borderRadius:7,padding:"7px 10px",marginBottom:6,fontSize:13,borderLeft:`2px solid ${BRAND.lightBlue}`}}>
                <span style={{color:BRAND.muted,fontSize:11,marginRight:8}}>{c.date}</span>{c.texte}
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <input style={{...inp,flex:1,padding:"6px 10px",fontSize:13}} placeholder="Ajouter un commentaire..." value={commentTexts[t.id]||""} onChange={e=>setCommentTexts(c=>({...c,[t.id]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addComment(t.id)}/>
              <Btn color={BRAND.lightBlue} onClick={()=>addComment(t.id)}>Ajouter</Btn>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{background:BRAND.bg,minHeight:"100vh",fontFamily:"Arial,sans-serif"}}>
      <div style={{background:BRAND.navy,padding:"0",marginBottom:0}}>
        <div style={{maxWidth:720,margin:"0 auto",padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <Logo/>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:"#8AAED4",fontWeight:500,letterSpacing:"0.5px",textTransform:"uppercase"}}>Exploitation</div>
            <div style={{fontSize:11,color:"#8AAED4",display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end",marginTop:2}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:saving?"#F59E0B":"#22C55E",display:"inline-block"}}></span>
              {saving?"Sauvegarde...":"Synchronisé"}
            </div>
          </div>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.1)",background:"rgba(0,0,0,0.15)"}}>
          <div style={{maxWidth:720,margin:"0 auto",padding:"0 20px",display:"flex",gap:0,overflowX:"auto"}}>
            {TABS.map((t,i)=>(
              <button key={i} onClick={()=>setTab(i)} style={{padding:"11px 18px",background:"none",border:"none",borderBottom:`3px solid ${tab===i?BRAND.red:"transparent"}`,color:tab===i?"#fff":"#8AAED4",fontWeight:tab===i?700:400,fontSize:13,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6,transition:"color 0.15s"}}>
                {t}
                {i===1&&enCours.length>0&&<span style={{background:BRAND.red,color:"#fff",borderRadius:10,fontSize:10,padding:"1px 6px",fontWeight:700}}>{enCours.length}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"20px"}}>
        {alertes.length>0&&!alertsDismissed&&(
          <div style={{background:"#FFF0F0",border:`1px solid ${BRAND.red}40`,borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <p style={{fontSize:12,fontWeight:700,color:BRAND.red,margin:"0 0 5px",textTransform:"uppercase",letterSpacing:"0.4px"}}>Alertes stock</p>
              {alertes.map((a,i)=><div key={i} style={{fontSize:12,color:"#5a0010"}}>{a.type} · {a.nom} — {a.stock} restant{a.stock>1?"s":""} (seuil : {a.seuil})</div>)}
            </div>
            <button onClick={()=>setAlertsDismissed(true)} style={{background:"none",border:"none",color:BRAND.red,cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>
          </div>
        )}

        {msg&&<div style={{padding:"9px 14px",borderRadius:8,marginBottom:14,background:msg.ok?"#EBF7F0":"#FFF0F0",color:msg.ok?BRAND.success:BRAND.danger,fontSize:13,fontWeight:500,border:`1px solid ${msg.ok?BRAND.success+"40":BRAND.danger+"40"}`}}>{msg.txt}</div>}

        {tab===0&&(
          <div style={card}>
            <h3 style={{fontSize:16,fontWeight:700,marginBottom:"1.1rem",marginTop:0,color:BRAND.navy,borderBottom:`2px solid ${BRAND.red}`,paddingBottom:8,display:"inline-block"}}>Nouvelle intervention</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div><label style={lbl}>Agent *</label>
                <select style={inp} value={form.agent} onChange={hc("agent")}><option value="">— Choisir —</option>{agents.map(a=><option key={a}>{a}</option>)}</select>
              </div>
              <div><label style={lbl}>Date *</label><input type="date" style={inp} value={form.date} onChange={hc("date")}/></div>
              <div><label style={lbl}>Zone *</label>
                <select style={inp} value={form.zone} onChange={hc("zone")}><option value="">— Choisir —</option>{zones.map(z=><option key={z}>{z}</option>)}</select>
              </div>
              <div><label style={lbl}>Type de travaux *</label>
                <select style={inp} value={form.type} onChange={hc("type")}><option value="">— Choisir —</option>{types.map(t=><option key={t}>{t}</option>)}</select>
              </div>
              <div><label style={lbl}>Priorité</label>
                <select style={inp} value={form.priorite} onChange={hc("priorite")}>{PRIORITES.map(p=><option key={p}>{p}</option>)}</select>
              </div>
            </div>
            {form.type==="Peinture"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:14}}>
                <div><label style={lbl}>Couleur</label>
                  <select style={inp} value={form.couleur} onChange={hc("couleur")}><option value="">— Choisir —</option>{stock.peinture.map(p=><option key={p.couleur} value={p.couleur}>{p.couleur} (stock: {p.stock})</option>)}</select>
                </div>
                <div><label style={lbl}>Nb pots utilisés</label><input type="number" min="1" style={inp} value={form.nbPots} onChange={hc("nbPots")}/></div>
              </div>
            )}
            {form.type==="Réparation grille/barrière"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:14}}>
                <div><label style={lbl}>Matériel utilisé</label>
                  <select style={inp} value={form.materielId} onChange={hc("materielId")}><option value="">— Optionnel —</option>{stock.materiel.map(m=><option key={m.id} value={m.id}>{m.nom} (stock: {m.stock})</option>)}</select>
                </div>
                <div><label style={lbl}>Quantité</label><input type="number" min="1" style={inp} value={form.qte} onChange={hc("qte")}/></div>
              </div>
            )}
            {form.type==="Utilisation engin"&&(
              <div style={{marginTop:14}}><label style={lbl}>Engin utilisé</label>
                <select style={inp} value={form.engin} onChange={hc("engin")}><option value="">— Choisir —</option>{ENGINS.map(e=><option key={e}>{e}</option>)}</select>
              </div>
            )}
            <div style={{marginTop:14}}><label style={lbl}>Description *</label>
              <textarea style={{...inp,minHeight:70,resize:"vertical",lineHeight:1.5}} value={form.description} onChange={hc("description")} placeholder="Décrire les travaux effectués..."/>
            </div>
            <div style={{marginTop:14}}>
              <label style={lbl}>Photo (optionnel)</label>
              <input type="file" accept="image/*" ref={photoRef} style={{display:"none"}} onChange={handlePhoto}/>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <Btn color={BRAND.navy} onClick={()=>{photoRef.current?.removeAttribute("capture");photoRef.current?.click();}}>Ordinateur</Btn>
                <Btn color={BRAND.navy} onClick={()=>{
  photoRef.current?.removeAttribute("capture");
  photoRef.current?.click();
}}>
  Ordinateur
</Btn>

<Btn color={BRAND.navy} onClick={()=>{
  photoRef.current?.setAttribute("capture","environment");
  photoRef.current?.click();
}}>
  Caméra
</Btn>
                {form.photo&&<><img src={form.photo} alt="" style={{height:38,borderRadius:5,objectFit:"cover",border:`1px solid ${BRAND.border}`}}/><Btn color={BRAND.danger} onClick={()=>setForm(f=>({...f,photo:null}))}>Supprimer</Btn></>}
              </div>
            </div>
            <button onClick={submit} style={{marginTop:18,padding:"10px 28px",background:BRAND.navy,color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontWeight:700,fontSize:14,letterSpacing:"0.3px"}}>Enregistrer l'intervention</button>
          </div>
        )}

        {tab===1&&(
          <div>
            <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"flex-end"}}>
              <div><label style={lbl}>Priorité</label>
                <select style={{...inp,width:"auto"}} value={filterPrio} onChange={e=>setFilterPrio(e.target.value)}><option>Tous</option>{PRIORITES.map(p=><option key={p}>{p}</option>)}</select>
              </div>
            </div>
            {enCoursFilt.length===0?<div style={{...card,color:BRAND.muted,fontSize:13,textAlign:"center",padding:"2rem"}}>Aucune intervention en cours</div>:enCoursFilt.map(t=><TravailCard key={t.id} t={t} actions={[<Btn key="ok" color={BRAND.success} onClick={()=>terminer(t.id)}>Marquer terminé</Btn>]}/>)}
            {termines.length>0&&(
              <>
                <div style={{display:"flex",alignItems:"center",gap:10,margin:"18px 0 10px"}}>
                  <div style={{flex:1,height:1,background:BRAND.border}}></div>
                  <span style={{fontSize:12,color:BRAND.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>Terminés — en attente d'archivage</span>
                  <div style={{flex:1,height:1,background:BRAND.border}}></div>
                </div>
                {termines.map(t=><TravailCard key={t.id} t={t} actions={[<Btn key="a" color={BRAND.muted} onClick={()=>archiver(t.id)}>Archiver</Btn>,<Btn key="r" color={BRAND.lightBlue} onClick={()=>rouvrir(t.id)}>Rouvrir</Btn>]}/>)}
              </>
            )}
          </div>
        )}

        {tab===2&&(
          <div>
            <div style={{marginBottom:16}}><label style={lbl}>Mois</label><input type="month" style={{...inp,width:"auto"}} value={filterMois} onChange={e=>setFilterMois(e.target.value)}/></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:20}}>
              {[{label:"En cours",val:enCours.length,color:BRAND.lightBlue},{label:"Urgentes",val:enCours.filter(t=>t.priorite==="Urgente").length,color:BRAND.red},{label:"Archivés ce mois",val:filteredArchives.length,color:BRAND.success},{label:"Agents actifs",val:new Set([...enCours,...filteredArchives].map(t=>t.agent)).size,color:BRAND.navy}].map(c=>(
                <div key={c.label} style={{background:BRAND.cardBg,border:`1px solid ${BRAND.border}`,borderRadius:10,padding:"1rem 1.1rem",borderTop:`3px solid ${c.color}`,boxShadow:"0 1px 4px rgba(0,59,122,0.07)"}}>
                  <div style={{fontSize:11,color:BRAND.muted,marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>{c.label}</div>
                  <div style={{fontSize:26,fontWeight:700,color:c.color}}>{c.val}</div>
                </div>
              ))}
            </div>
            {byAgentDash.length===0?<div style={{...card,color:BRAND.muted,fontSize:13,textAlign:"center",padding:"2rem"}}>Aucune donnée pour cette période</div>:byAgentDash.map(a=>(
              <div key={a.agent} style={card}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontWeight:700,color:BRAND.navy}}>{a.agent}</span>
                  <div style={{display:"flex",gap:6}}>
                    {a.enCours>0&&<span style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:BRAND.lightBlue+"20",color:BRAND.lightBlue,fontWeight:600,border:`1px solid ${BRAND.lightBlue}30`}}>{a.enCours} en cours</span>}
                    {a.total>0&&<span style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:BRAND.success+"20",color:BRAND.success,fontWeight:600,border:`1px solid ${BRAND.success}30`}}>{a.total} archivé{a.total>1?"s":""}</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {a.types.filter(t=>t.n>0).map(t=><TypeBadge key={t.type} type={t.type}/>)}
                </div>
              </div>
            ))}
            <Btn color={BRAND.navy} onClick={()=>exportCSV([["Agent","Zone","Type","Priorité","Date","Archivé le"],...filteredArchives.map(t=>[t.agent,t.zone,t.type,t.priorite||"",t.date,t.archivedAt||""])],`tableau_bord_${filterMois}.csv`)} style={{marginTop:8}}>Exporter CSV du mois</Btn>
          </div>
        )}

        {tab===3&&(
          <div>
            <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"flex-end"}}>
              <div><label style={lbl}>Mois</label><input type="month" style={{...inp,width:"auto"}} value={filterMois} onChange={e=>setFilterMois(e.target.value)}/></div>
              <div><label style={lbl}>Agent</label><select style={{...inp,width:"auto"}} value={filterAgent} onChange={e=>setFilterAgent(e.target.value)}><option>Tous</option>{agents.map(a=><option key={a}>{a}</option>)}</select></div>
              <div><label style={lbl}>Type</label><select style={{...inp,width:"auto"}} value={filterType} onChange={e=>setFilterType(e.target.value)}><option>Tous</option>{types.map(t=><option key={t}>{t}</option>)}</select></div>
              <Btn color={BRAND.navy} onClick={()=>exportCSV([["Agent","Zone","Type","Priorité","Description","Couleur","Pots","Engin","Date","Archivé le"],...filteredArchives.map(t=>[t.agent,t.zone,t.type,t.priorite||"",t.description,t.couleur||"",t.nbPots||"",t.engin||"",t.date,t.archivedAt||""])],`archives_${filterMois}.csv`)}>Exporter CSV</Btn>
            </div>
            {filteredArchives.length===0?<div style={{...card,color:BRAND.muted,fontSize:13,textAlign:"center",padding:"2rem"}}>Aucune archive pour cette période</div>:filteredArchives.map(t=><TravailCard key={t.id} t={t} actions={[<Btn key="ro" color={BRAND.lightBlue} onClick={()=>rouvrir(t.id)}>Rouvrir</Btn>]}/>)}
          </div>
        )}

        {tab===4&&(
          <div>
            <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
              {[...paramSections,{key:"stock",label:"Stock & seuils"},{key:"backup",label:"Sauvegarde"}].map(s=>(
                <button key={s.key} onClick={()=>{setParamTab(s.key);setEditIdx(null);setConfirmDel(null);setNewItem("");}} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${paramTab===s.key?BRAND.navy:BRAND.border}`,background:paramTab===s.key?BRAND.navy:"#fff",color:paramTab===s.key?"#fff":BRAND.muted,fontSize:13,cursor:"pointer",fontWeight:paramTab===s.key?700:400}}>{s.label}</button>
              ))}
            </div>
            {paramMsg&&<div style={{padding:"8px 12px",borderRadius:7,marginBottom:12,background:paramMsg.ok?"#EBF7F0":"#FFF0F0",color:paramMsg.ok?BRAND.success:BRAND.danger,fontSize:13,fontWeight:500}}>{paramMsg.txt}</div>}

            {["agents","zones","types"].includes(paramTab)&&(
              <div style={card}>
                <div style={{display:"flex",gap:8,marginBottom:16}}>
                  <input style={{...inp,flex:1}} placeholder={`Nouveau · ${paramSections.find(s=>s.key===paramTab)?.label}`} value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addParamItem()}/>
                  <button onClick={addParamItem} style={{padding:"8px 18px",background:BRAND.navy,color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:13}}>Ajouter</button>
                </div>
                {paramSections.find(s=>s.key===paramTab)?.items.map((a,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:`1px solid ${BRAND.border}`}}>
                    {editIdx===i
                      ?<><input style={{...inp,flex:1,padding:"5px 8px",fontSize:13}} value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveParamEdit(i);if(e.key==="Escape")setEditIdx(null);}} autoFocus/><Btn color={BRAND.success} onClick={()=>saveParamEdit(i)}>OK</Btn><Btn color={BRAND.muted} onClick={()=>setEditIdx(null)}>Annuler</Btn></>
                      :<><span style={{flex:1,fontSize:14,color:BRAND.navy}}>{a}</span><Btn color={BRAND.lightBlue} onClick={()=>{setEditIdx(i);setEditVal(a);}}>Modifier</Btn>{confirmDel===i?<><span style={{fontSize:12,color:BRAND.danger,fontWeight:600}}>Confirmer ?</span><Btn color={BRAND.danger} onClick={()=>deleteParamItem(i)}>Oui</Btn><Btn color={BRAND.muted} onClick={()=>setConfirmDel(null)}>Non</Btn></>:<Btn color={BRAND.danger} onClick={()=>setConfirmDel(i)}>Supprimer</Btn>}</>
                    }
                  </div>
                ))}
              </div>
            )}

            {paramTab==="stock"&&(
              <div>
                {[{key:"peinture",label:"Peinture",items:stock.peinture,nameKey:"couleur"},{key:"materiel",label:"Matériel",items:stock.materiel,nameKey:"nom"}].map(sec=>(
                  <div key={sec.key} style={card}>
                    <h3 style={{fontSize:14,fontWeight:700,marginTop:0,marginBottom:12,color:BRAND.navy,textTransform:"uppercase",letterSpacing:"0.4px"}}>{sec.label}</h3>
                    {sec.items.map((item,i)=>(
                      <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${BRAND.border}`,flexWrap:"wrap"}}>
                        <span style={{flex:1,fontSize:13,color:BRAND.navy,minWidth:80}}>{item[sec.nameKey]}</span>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <button onClick={()=>adjustStock(sec.key,i,-1)} style={{width:28,height:28,borderRadius:"50%",border:`1px solid ${BRAND.danger}40`,background:BRAND.danger+"12",color:BRAND.danger,cursor:"pointer",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                          <span style={{fontSize:15,fontWeight:700,minWidth:28,textAlign:"center",color:item.stock<=item.seuil?BRAND.danger:BRAND.success}}>{item.stock}</span>
                          <button onClick={()=>adjustStock(sec.key,i,1)} style={{width:28,height:28,borderRadius:"50%",border:`1px solid ${BRAND.success}40`,background:BRAND.success+"12",color:BRAND.success,cursor:"pointer",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <span style={{fontSize:11,color:BRAND.muted,fontWeight:600}}>Seuil</span>
                          <input type="number" min="0" style={{...inp,width:54,padding:"4px 6px",fontSize:12}} value={item.seuil} onChange={e=>setSeuil(sec.key,i,e.target.value)}/>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {stock.historique.length>0&&(
                  <div style={card}>
                    <h3 style={{fontSize:14,fontWeight:700,marginTop:0,marginBottom:12,color:BRAND.navy,textTransform:"uppercase",letterSpacing:"0.4px"}}>Historique des mouvements</h3>
                    {stock.historique.slice(0,20).map(h=>(
                      <div key={h.id} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:`1px solid ${BRAND.border}`,fontSize:12}}>
                        <span style={{color:BRAND.muted,minWidth:76}}>{h.date}</span>
                        <span style={{color:h.action==="Réappro"?BRAND.success:h.action==="Consommation"?BRAND.lightBlue:BRAND.warning,minWidth:84,fontWeight:600}}>{h.action}</span>
                        <span style={{flex:1,color:BRAND.navy}}>{h.detail}</span>
                        <span style={{color:BRAND.muted}}>{h.agent}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {paramTab==="backup"&&(
              <div style={card}>
                <h3 style={{fontSize:14,fontWeight:700,marginTop:0,marginBottom:8,color:BRAND.navy}}>Sauvegarde & restauration</h3>
                <p style={{fontSize:13,color:BRAND.muted,marginBottom:18,lineHeight:1.6}}>Exporte toutes les données en JSON pour les conserver ou les transférer vers un autre appareil.</p>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <button onClick={exportJSON} style={{padding:"9px 20px",background:BRAND.navy,color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700}}>Exporter JSON</button>
                  <label style={{padding:"9px 20px",border:`1px solid ${BRAND.border}`,borderRadius:7,cursor:"pointer",fontSize:13,color:BRAND.navy,fontWeight:600,background:"#fff"}}>
                    Importer JSON
                    <input type="file" accept=".json" style={{display:"none"}} onChange={importJSON}/>
                  </label>
                </div>
                <div style={{marginTop:16,padding:"10px 14px",background:BRAND.bg,borderRadius:8,fontSize:12,color:BRAND.muted,borderLeft:`3px solid ${BRAND.lightBlue}`}}>
                  Les données sont partagées en temps réel entre tous les utilisateurs. La sauvegarde JSON permet une copie locale ou une migration.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
